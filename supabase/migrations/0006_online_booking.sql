-- =============================================================
-- 0006_online_booking.sql
-- Online Randevu Linki: müşteriler herkese açık bir linkten randevu alır.
--
-- GÜVENLİK: anon kullanıcı tablolara doğrudan erişmez. Public randevu
-- sayfası yalnızca token doğrulayan SECURITY DEFINER fonksiyonlarıyla
-- okur (booking_config) ve yazar (create_booking).
--
-- Supabase SQL Editor'da elle çalıştırın. Tekrar-güvenli yazıldı.
-- =============================================================

-- Hangi hizmetler online randevuda görünsün
alter table public.services
  add column if not exists bookable boolean not null default true;

-- Randevunun online linkten gelip gelmediği (istatistik)
alter table public.appointments
  add column if not exists booked_online boolean not null default false;

-- İşletme başına randevu linki ayarları
create table if not exists public.booking_settings (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  business_id  uuid not null unique references public.businesses(id) on delete cascade,
  token        text not null unique,
  slot_minutes int not null default 30,
  work_days    int[] not null default '{1,2,3,4,5}',   -- 1=Pzt ... 7=Paz
  start_time   text not null default '09:00',
  end_time     text not null default '18:00',
  is_active    boolean not null default true
);

alter table public.booking_settings enable row level security;

drop policy if exists "booking_settings_all_same_business" on public.booking_settings;
create policy "booking_settings_all_same_business"
  on public.booking_settings for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- =============================================================
-- Public okuma: token ile randevu sayfası yapılandırması
-- =============================================================
create or replace function public.booking_config(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.booking_settings%rowtype;
  b uuid;
begin
  select * into s from public.booking_settings
  where token = p_token and is_active = true limit 1;
  if not found then
    return jsonb_build_object('valid', false);
  end if;
  b := s.business_id;

  return jsonb_build_object(
    'valid', true,
    'business_name', (select name from public.businesses where id = b),
    'slot_minutes', s.slot_minutes,
    'work_days', to_jsonb(s.work_days),
    'start_time', s.start_time,
    'end_time', s.end_time,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price', price, 'duration_min', duration_min) order by name)
      from public.services
      where business_id = b and bookable = true
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.booking_config(text) to anon, authenticated;

-- =============================================================
-- Public yazma: token ile randevu oluştur (müşteri lead olarak açılır)
-- =============================================================
create or replace function public.create_booking(
  p_token text,
  p_name text,
  p_phone text,
  p_service_id uuid,
  p_starts_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.booking_settings%rowtype;
  b uuid;
  cust_id uuid;
  first_stage uuid;
begin
  select * into s from public.booking_settings
  where token = p_token and is_active = true limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'gecersiz_link');
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'eksik_bilgi');
  end if;
  b := s.business_id;

  -- Aynı telefonlu müşteri varsa onu kullan, yoksa lead olarak aç
  select id into cust_id from public.customers
  where business_id = b and phone = trim(p_phone) limit 1;

  if cust_id is null then
    -- Yeni lead'i pipeline'ın ilk aşamasına yerleştir ki Lead'ler panosunda görünsün
    select id into first_stage from public.pipeline_stages
    where business_id = b order by position asc limit 1;

    insert into public.customers (business_id, full_name, phone, is_lead, source, status, pipeline_stage_id)
    values (b, trim(p_name), trim(p_phone), true, 'Online Randevu', 'new', first_stage)
    returning id into cust_id;
  end if;

  insert into public.appointments (business_id, customer_id, service_id, starts_at, status, booked_online, note)
  values (b, cust_id, p_service_id, p_starts_at, 'planned', true, 'Online randevu linkinden alındı');

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.create_booking(text, text, text, uuid, timestamptz) to anon, authenticated;
