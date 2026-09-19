-- =============================================================
-- 0020_shifts.sql
-- Personel vardiyası + randevu çakışma kontrolü.
--
-- KRİTİK: Şu ana kadar aynı personele aynı saate iki randevu
-- girilebiliyordu. Bir güzellik merkezinde bu doğrudan operasyonel
-- sorun demek (müşteri geliyor, personel dolu).
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- =============================================================
-- 1) staff_shifts — haftalık çalışma düzeni
-- =============================================================
create table if not exists public.staff_shifts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,
  -- 1 = Pazartesi … 7 = Pazar (booking_settings.work_days ile aynı)
  weekday     int not null check (weekday between 1 and 7),
  start_time  text not null default '09:00',
  end_time    text not null default '18:00',
  is_active   boolean not null default true,
  unique (staff_id, weekday)
);

alter table public.staff_shifts enable row level security;

drop policy if exists "staff_shifts_all_same_business" on public.staff_shifts;
create policy "staff_shifts_all_same_business"
  on public.staff_shifts for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_staff_shifts_staff
  on public.staff_shifts(staff_id, weekday);

-- =============================================================
-- 2) staff_time_off — izin / tatil
-- =============================================================
create table if not exists public.staff_time_off (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id    uuid not null references public.staff(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  check (ends_at > starts_at)
);

alter table public.staff_time_off enable row level security;

drop policy if exists "staff_time_off_all_same_business" on public.staff_time_off;
create policy "staff_time_off_all_same_business"
  on public.staff_time_off for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_staff_time_off_range
  on public.staff_time_off(staff_id, starts_at, ends_at);

-- =============================================================
-- 3) Randevu süresini bulmak için yardımcı
--    (hizmet süresi yoksa 30 dk varsayılır)
-- =============================================================
create or replace function public.appointment_duration(p_service_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select duration_min from public.services where id = p_service_id), 30);
$$;

grant execute on function public.appointment_duration(uuid) to authenticated;

-- =============================================================
-- 4) Çakışma kontrolü
--    Aynı personelin zaman aralığı kesişen başka planlı randevusu
--    var mı? (iptal/tamamlanan sayılmaz, düzenlenen randevu hariç)
-- =============================================================
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
    and a.status = 'planned'
    and (p_exclude_id is null or a.id <> p_exclude_id)
    -- aralıklar kesişiyor mu: [start, start+dur) ∩ [a.start, a.start+a.dur)
    and a.starts_at < p_starts_at + make_interval(mins => p_duration)
    and p_starts_at < a.starts_at
        + make_interval(mins => public.appointment_duration(a.service_id))
  limit 5;
$$;

grant execute on function public.check_appointment_conflict(uuid, timestamptz, int, uuid) to authenticated;

-- =============================================================
-- 5) Personel o saatte çalışıyor mu? (vardiya + izin kontrolü)
--    Vardiya hiç tanımlanmamışsa kısıtlama uygulanmaz (geriye uyumlu).
-- =============================================================
create or replace function public.is_staff_available(
  p_staff_id  uuid,
  p_starts_at timestamptz
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_has_shifts boolean;
  v_weekday    int;
  v_time       text;
  v_ok         boolean;
  v_off        boolean;
begin
  -- İzinli mi?
  select exists(
    select 1 from public.staff_time_off t
    where t.staff_id = p_staff_id
      and p_starts_at >= t.starts_at
      and p_starts_at <  t.ends_at
  ) into v_off;
  if v_off then return false; end if;

  select exists(select 1 from public.staff_shifts s where s.staff_id = p_staff_id and s.is_active)
    into v_has_shifts;
  if not v_has_shifts then return true; end if;

  -- ISO: Pazartesi=1 … Pazar=7
  v_weekday := extract(isodow from p_starts_at)::int;
  v_time    := to_char(p_starts_at, 'HH24:MI');

  select exists(
    select 1 from public.staff_shifts s
    where s.staff_id = p_staff_id
      and s.weekday = v_weekday
      and s.is_active
      and v_time >= s.start_time
      and v_time <  s.end_time
  ) into v_ok;

  return v_ok;
end;
$$;

grant execute on function public.is_staff_available(uuid, timestamptz) to authenticated;
