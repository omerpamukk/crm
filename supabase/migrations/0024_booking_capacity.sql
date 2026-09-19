-- =============================================================
-- 0024_booking_capacity.sql
-- Online randevuda slot kapasitesi + KVKK rızası.
--
-- SORUN: create_booking (0006) hiçbir kontrol yapmadan randevu açıyordu.
-- Aynı saate sınırsız müşteri randevu alabiliyor, salon fiziksel
-- kapasitesini aşıyordu.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- ÖNCE 0016 (consents) çalıştırılmış olmalı.
-- =============================================================

-- Aynı slotta kaç randevu kabul edilsin (kabin/personel sayısı)
alter table public.booking_settings
  add column if not exists slot_capacity int not null default 1
    check (slot_capacity >= 1);

-- =============================================================
-- create_booking — kapasite kontrolü + KVKK rızası eklendi
-- =============================================================
create or replace function public.create_booking(
  p_token text,
  p_name text,
  p_phone text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_kvkk boolean default false
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
  taken int;
begin
  select * into s from public.booking_settings
  where token = p_token and is_active = true limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'gecersiz_link');
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'eksik_bilgi');
  end if;

  -- Geçmişe randevu alınamaz
  if p_starts_at < now() then
    return jsonb_build_object('ok', false, 'error', 'gecmis_tarih');
  end if;

  b := s.business_id;

  -- Slot dolu mu? (aynı başlangıç saatindeki planlı randevular)
  select count(*) into taken
  from public.appointments a
  where a.business_id = b
    and a.status = 'planned'
    and a.starts_at = p_starts_at;

  if taken >= s.slot_capacity then
    return jsonb_build_object('ok', false, 'error', 'slot_dolu');
  end if;

  -- Aynı telefonlu müşteri varsa onu kullan, yoksa lead olarak aç
  select id into cust_id from public.customers
  where business_id = b and phone = trim(p_phone) limit 1;

  if cust_id is null then
    select id into first_stage from public.pipeline_stages
    where business_id = b order by position asc limit 1;

    insert into public.customers (business_id, full_name, phone, is_lead, source, status, pipeline_stage_id)
    values (b, trim(p_name), trim(p_phone), true, 'Online Randevu', 'new', first_stage)
    returning id into cust_id;
  end if;

  -- Aynı müşteri aynı saate ikinci kez randevu almasın
  if exists (
    select 1 from public.appointments a
    where a.business_id = b
      and a.customer_id = cust_id
      and a.status = 'planned'
      and a.starts_at = p_starts_at
  ) then
    return jsonb_build_object('ok', false, 'error', 'zaten_randevu_var');
  end if;

  insert into public.appointments (business_id, customer_id, service_id, starts_at, status, booked_online, note)
  values (b, cust_id, p_service_id, p_starts_at, 'planned', true, 'Online randevu linkinden alındı');

  -- KVKK rızası verildiyse kaydet (consents tablosu 0016'da açılır)
  if p_kvkk then
    insert into public.consents (business_id, customer_id, kind, granted, source)
    values (b, cust_id, 'kvkk', true, 'online_booking')
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.create_booking(text, text, text, uuid, timestamptz, boolean) to anon, authenticated;

-- =============================================================
-- booking_config — kapasiteyi de döndürsün (dolu slotları gizlemek için)
-- =============================================================
create or replace function public.booking_config(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.booking_settings%rowtype;
  biz_name text;
  svc jsonb;
begin
  select * into s from public.booking_settings
  where token = p_token and is_active = true limit 1;
  if not found then
    return jsonb_build_object('valid', false);
  end if;

  select name into biz_name from public.businesses where id = s.business_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', x.id, 'name', x.name, 'duration_min', x.duration_min, 'price', x.price
  ) order by x.name), '[]'::jsonb)
  into svc
  from public.services x
  where x.business_id = s.business_id and x.bookable;

  return jsonb_build_object(
    'valid', true,
    'business_name', biz_name,
    'slot_minutes', s.slot_minutes,
    'slot_capacity', s.slot_capacity,
    'work_days', s.work_days,
    'start_time', s.start_time,
    'end_time', s.end_time,
    'services', svc
  );
end;
$$;

grant execute on function public.booking_config(text) to anon, authenticated;

-- =============================================================
-- booked_slots — belirli bir gündeki dolu saatler (anon erişebilir)
-- Müşteriye dolu saatleri göstermemek için.
-- =============================================================
create or replace function public.booked_slots(p_token text, p_day date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.booking_settings%rowtype;
  result jsonb;
begin
  select * into s from public.booking_settings
  where token = p_token and is_active = true limit 1;
  if not found then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into result
  from (
    select to_char(a.starts_at, 'HH24:MI') as slot, count(*) as taken
    from public.appointments a
    where a.business_id = s.business_id
      and a.status = 'planned'
      and a.starts_at >= p_day::timestamptz
      and a.starts_at <  (p_day + 1)::timestamptz
    group by 1
    having count(*) >= s.slot_capacity
  ) t;

  return result;
end;
$$;

grant execute on function public.booked_slots(text, date) to anon, authenticated;
