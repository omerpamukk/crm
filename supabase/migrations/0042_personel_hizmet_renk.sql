-- =============================================================
-- 0042_personel_hizmet_renk.sql
-- Personel: renk + verdiği hizmetler; online randevuda personel seçimi.
--   1) staff.color — takvimde personelin rengi (sabit listeden bir ad)
--   2) staff_services — personelin verdiği hizmetler.
--      Hiç satırı olmayan personel = "Tüm hizmetler" (geriye uyumlu).
--   3) booking_settings.choose_staff — online randevuda müşteri personel
--      seçebilsin mi (varsayılan kapalı: eski davranış aynen sürer).
--   4) booking_config: choose_staff açıksa aktif personeli ve hizmetlerini döndürür.
--   5) booking_blocked_slots: seçilen gün + hizmet (+ personel) için dolu saatler.
--      choose_staff kapalıysa booked_slots ile aynı sonucu verir.
--   6) create_booking: isteğe bağlı p_staff_id. choose_staff açıksa
--      personelin vardiyası, izni ve diğer randevularıyla çakışma kontrol edilir;
--      "Fark etmez" seçilirse o saatte boş olan personele atanır.
--
-- Dayandığı: 0004 (staff, appointments.staff_member_id), 0006, 0020
-- (staff_shifts, staff_time_off, appointment_duration), 0024, 0028,
-- 0029 (is_staff_available_tz), 0030.
-- Tekrar-güvenli. Kullanıcı Supabase SQL Editor'da elle çalıştırır.
-- =============================================================

-- -------------------------------------------------------------
-- 1) Personel rengi
-- -------------------------------------------------------------
alter table public.staff
  add column if not exists color text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'staff_color_check'
  ) then
    alter table public.staff
      add constraint staff_color_check
      check (color is null or color in ('indigo','mavi','turkuaz','yesil','turuncu','pembe','mor','kahve'));
  end if;
end $$;

-- -------------------------------------------------------------
-- 2) Personelin verdiği hizmetler
-- -------------------------------------------------------------
create table if not exists public.staff_services (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,
  service_id  uuid not null references public.services(id) on delete cascade,
  unique (staff_id, service_id)
);

create index if not exists idx_staff_services_business
  on public.staff_services(business_id);
create index if not exists idx_staff_services_service
  on public.staff_services(service_id);

alter table public.staff_services enable row level security;

drop policy if exists "staff_services_all_same_business" on public.staff_services;
create policy "staff_services_all_same_business"
  on public.staff_services for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- -------------------------------------------------------------
-- 3) Online randevuda personel seçimi (işletme ayarı)
-- -------------------------------------------------------------
alter table public.booking_settings
  add column if not exists choose_staff boolean not null default false;

-- -------------------------------------------------------------
-- Yardımcı: personel bu hizmeti, bu saatte alabilir mi?
-- (aktif + hizmeti veriyor + vardiyada/izinde değil + çakışan randevu yok)
-- Yalnızca diğer security definer fonksiyonlardan çağrılır.
-- -------------------------------------------------------------
create or replace function public.staff_can_take(
  p_business  uuid,
  p_staff     uuid,
  p_service   uuid,
  p_starts_at timestamptz,
  p_duration  int
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.staff st
    where st.id = p_staff and st.business_id = p_business and st.is_active
  ) then
    return false;
  end if;

  -- Hizmet listesi tanımlıysa bu hizmet içinde olmalı (boş liste = tüm hizmetler)
  if exists (select 1 from public.staff_services x where x.staff_id = p_staff)
     and not exists (
       select 1 from public.staff_services x
       where x.staff_id = p_staff and x.service_id = p_service
     ) then
    return false;
  end if;

  if not public.is_staff_available_tz(p_staff, p_starts_at) then
    return false;
  end if;

  return not exists (
    select 1 from public.appointments a
    where a.business_id = p_business
      and a.staff_member_id = p_staff
      and a.status in ('planned', 'arrived')
      and a.starts_at < p_starts_at + make_interval(mins => p_duration)
      and p_starts_at < a.starts_at
          + make_interval(mins => public.appointment_duration(a.service_id))
  );
end;
$$;

revoke execute on function public.staff_can_take(uuid, uuid, uuid, timestamptz, int) from public, anon, authenticated;

-- -------------------------------------------------------------
-- 4) booking_config — choose_staff ve personel listesi eklendi (0024'ün devamı)
-- -------------------------------------------------------------
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
  stf jsonb := '[]'::jsonb;
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

  if s.choose_staff then
    -- Müşteriye yalnızca ad ve verdiği hizmetler gider (telefon, prim vb. gitmez)
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', st.id,
      'name', st.full_name,
      'service_ids', (
        select coalesce(jsonb_agg(x.service_id), '[]'::jsonb)
        from public.staff_services x where x.staff_id = st.id
      )
    ) order by st.full_name), '[]'::jsonb)
    into stf
    from public.staff st
    where st.business_id = s.business_id and st.is_active;
  end if;

  return jsonb_build_object(
    'valid', true,
    'business_name', biz_name,
    'slot_minutes', s.slot_minutes,
    'slot_capacity', s.slot_capacity,
    'work_days', s.work_days,
    'start_time', s.start_time,
    'end_time', s.end_time,
    'services', svc,
    'choose_staff', s.choose_staff,
    'staff', stf
  );
end;
$$;

grant execute on function public.booking_config(text) to anon, authenticated;

-- -------------------------------------------------------------
-- 5) booking_blocked_slots — o gün alınamayacak saatler ("HH24:MI")
--    p_staff_id null = "Fark etmez": hizmeti veren personelden en az
--    biri boşsa saat açıktır.
-- -------------------------------------------------------------
create or replace function public.booking_blocked_slots(
  p_token      text,
  p_day        date,
  p_service_id uuid,
  p_staff_id   uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s     public.booking_settings%rowtype;
  dur   int;
  t     timestamp;
  v_at  timestamptz;
  ok    boolean;
  v_out jsonb := '[]'::jsonb;
begin
  select * into s from public.booking_settings
  where token = p_token and is_active = true limit 1;
  if not found then
    return '[]'::jsonb;
  end if;

  if not s.choose_staff then
    return public.booked_slots(p_token, p_day);
  end if;

  if not exists (
    select 1 from public.services x where x.id = p_service_id and x.business_id = s.business_id
  ) then
    return '[]'::jsonb;
  end if;

  dur := public.appointment_duration(p_service_id);

  for t in
    select g from generate_series(
      p_day + s.start_time::time,
      p_day + s.end_time::time - make_interval(mins => greatest(s.slot_minutes, 5)),
      make_interval(mins => greatest(s.slot_minutes, 5))
    ) as g
  loop
    v_at := t at time zone 'Europe/Istanbul';
    if p_staff_id is not null then
      ok := public.staff_can_take(s.business_id, p_staff_id, p_service_id, v_at, dur);
    else
      ok := exists (
        select 1 from public.staff st
        where st.business_id = s.business_id and st.is_active
          and public.staff_can_take(s.business_id, st.id, p_service_id, v_at, dur)
      );
    end if;
    if not ok then
      v_out := v_out || jsonb_build_object('slot', to_char(t, 'HH24:MI'));
    end if;
  end loop;

  return v_out;
end;
$$;

grant execute on function public.booking_blocked_slots(text, date, uuid, uuid) to anon, authenticated;

-- -------------------------------------------------------------
-- 6) create_booking — isteğe bağlı personel (0028'in devamı)
--    Eski 6 parametreli çağrı aynen çalışır (p_staff_id varsayılan null).
-- -------------------------------------------------------------
drop function if exists public.create_booking(text, text, text, uuid, timestamptz, boolean);

create or replace function public.create_booking(
  p_token text,
  p_name text,
  p_phone text,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_kvkk boolean default false,
  p_staff_id uuid default null
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
  dur int;
  v_staff uuid;
begin
  select * into s from public.booking_settings
  where token = p_token and is_active = true limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'gecersiz_link');
  end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_phone), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'eksik_bilgi');
  end if;

  if p_starts_at < now() then
    return jsonb_build_object('ok', false, 'error', 'gecmis_tarih');
  end if;

  b := s.business_id;

  -- Hizmet bu işletmenin olmalı
  if p_service_id is not null and not exists (
    select 1 from public.services x where x.id = p_service_id and x.business_id = b
  ) then
    return jsonb_build_object('ok', false, 'error', 'eksik_bilgi');
  end if;

  -- Aynı işletmeye aynı anda gelen iki talep sırayla işlensin (çifte randevu olmasın)
  perform pg_advisory_xact_lock(hashtext('create_booking:' || b::text));

  if s.choose_staff then
    dur := public.appointment_duration(p_service_id);
    if p_staff_id is not null then
      if not public.staff_can_take(b, p_staff_id, p_service_id, p_starts_at, dur) then
        return jsonb_build_object('ok', false, 'error', 'slot_dolu');
      end if;
      v_staff := p_staff_id;
    else
      -- "Fark etmez": o gün en az randevusu olan boş personel
      select st.id into v_staff
      from public.staff st
      where st.business_id = b and st.is_active
        and public.staff_can_take(b, st.id, p_service_id, p_starts_at, dur)
      order by (
        select count(*) from public.appointments a
        where a.staff_member_id = st.id
          and a.status in ('planned', 'arrived')
          and (a.starts_at at time zone 'Europe/Istanbul')::date
              = (p_starts_at at time zone 'Europe/Istanbul')::date
      ), st.full_name
      limit 1;
      if v_staff is null then
        return jsonb_build_object('ok', false, 'error', 'slot_dolu');
      end if;
    end if;
  else
    -- Eski davranış: aynı başlangıç saatindeki randevu sayısı kapasiteyi aşmasın
    select count(*) into taken
    from public.appointments a
    where a.business_id = b
      and a.status in ('planned', 'arrived')
      and a.starts_at = p_starts_at;

    if taken >= s.slot_capacity then
      return jsonb_build_object('ok', false, 'error', 'slot_dolu');
    end if;
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

  if exists (
    select 1 from public.appointments a
    where a.business_id = b
      and a.customer_id = cust_id
      and a.status in ('planned', 'arrived')
      and a.starts_at = p_starts_at
  ) then
    return jsonb_build_object('ok', false, 'error', 'zaten_randevu_var');
  end if;

  insert into public.appointments
    (business_id, customer_id, service_id, staff_member_id, starts_at, status, booked_online, note)
  values
    (b, cust_id, p_service_id, v_staff, p_starts_at, 'planned', true, 'Online randevu linkinden alındı');

  if p_kvkk then
    insert into public.consents (business_id, customer_id, kind, granted, source)
    values (b, cust_id, 'kvkk', true, 'online_booking')
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.create_booking(text, text, text, uuid, timestamptz, boolean, uuid) to anon, authenticated;
