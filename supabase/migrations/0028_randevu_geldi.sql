-- =============================================================
-- 0028_randevu_geldi.sql
-- Randevuya "Geldi" durumu (status = 'arrived') + geliş saati.
--
-- Akış: Planlandı (planned) -> Geldi (arrived) -> Tamamlandı (completed).
-- appointments.status düz metin sütunu (CHECK kısıtı yok, 0001), bu yüzden
-- yeni değer için kısıt genişletmesi gerekmez.
--
-- 1) appointments.arrived_at: Geldi'ye geçilen an (geri alınınca null).
-- 2) Aşağıdaki fonksiyonlar "yer tutan randevu" olarak yalnızca 'planned'a
--    bakıyordu; müşteri geldiğinde saat/kabin boşalmış sayılıp çift
--    rezervasyon olmasın diye 'arrived' da dolu sayılır. Gövdeler,
--    yalnızca durum filtresi değişerek, son tanımlarından aynen alındı:
--      check_appointment_conflict (0020), create_booking + booked_slots (0024),
--      sidebar_badges (0022).
--    Seans düşümü / last_visit_at tetikleyicisi (0003) yalnızca 'completed'
--    geçişinde çalışır; 'arrived' bunu tetiklemez (istenen davranış).
--
-- Tekrar-güvenli. Supabase SQL Editor'da elle çalıştırın.
-- Dayandığı: 0001, 0003, 0020, 0022, 0024.
-- =============================================================

alter table public.appointments
  add column if not exists arrived_at timestamptz;

-- check_appointment_conflict (0020)
create or replace function public.check_appointment_conflict(
  p_staff_id    uuid,
  p_starts_at   timestamptz,
  p_duration    int,
  p_exclude_id  uuid default null
)
returns table (
  conflict_id    uuid,
  conflict_start timestamptz,
  customer_name  text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.starts_at,
    coalesce(c.full_name, 'İsimsiz')
  from public.appointments a
  left join public.customers c on c.id = a.customer_id
  where a.business_id = public.current_business_id()
    and a.staff_member_id = p_staff_id
    and a.status in ('planned', 'arrived')
    and (p_exclude_id is null or a.id <> p_exclude_id)
    -- aralıklar kesişiyor mu: [start, start+dur) ∩ [a.start, a.start+a.dur)
    and a.starts_at < p_starts_at + make_interval(mins => p_duration)
    and p_starts_at < a.starts_at
        + make_interval(mins => public.appointment_duration(a.service_id))
  limit 5;
$$;

grant execute on function public.check_appointment_conflict(uuid, timestamptz, int, uuid) to authenticated;

-- create_booking (0024)
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
    and a.status in ('planned', 'arrived')
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
      and a.status in ('planned', 'arrived')
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

-- booked_slots (0024)
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
      and a.status in ('planned', 'arrived')
      and a.starts_at >= p_day::timestamptz
      and a.starts_at <  (p_day + 1)::timestamptz
    group by 1
    having count(*) >= s.slot_capacity
  ) t;

  return result;
end;
$$;

grant execute on function public.booked_slots(text, date) to anon, authenticated;

-- sidebar_badges (0022)
create or replace function public.sidebar_badges()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with biz as (select public.current_business_id() as id),
  overdue as (
    select count(distinct p.customer_id) as n
    from public.packages p, biz
    where p.business_id = biz.id
      and p.customer_id is not null
      and coalesce(p.price, 0) - coalesce(p.paid_amount, 0) > 0
      and p.purchased_at < now() - interval '30 days'
  ),
  today_appt as (
    select count(*) as n
    from public.appointments a, biz
    where a.business_id = biz.id
      and a.status in ('planned', 'arrived')
      and a.starts_at >= date_trunc('day', now())
      and a.starts_at <  date_trunc('day', now()) + interval '1 day'
  ),
  upcoming as (
    select count(*) as n
    from public.appointments a, biz
    where a.business_id = biz.id
      and a.status in ('planned', 'arrived')
      and a.starts_at >= now()
  ),
  cust as (
    select
      count(*) filter (where not coalesce(is_lead, false)) as customers,
      count(*) filter (where coalesce(is_lead, false))     as leads
    from public.customers c, biz
    where c.business_id = biz.id
  )
  select json_build_object(
    'overdueCari',   (select n from overdue),
    'todayAppts',    (select n from today_appt),
    'upcomingAppts', (select n from upcoming),
    'customers',     (select customers from cust),
    'leads',         (select leads from cust)
  );
$$;

grant execute on function public.sidebar_badges() to authenticated;
