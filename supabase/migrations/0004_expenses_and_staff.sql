-- =============================================================
-- 0004_expenses_and_staff.sql
-- Gider yönetimi (expenses) + Personel (staff) + randevu-personel bağlantısı
--
-- Bu dosyayı Supabase SQL Editor'da elle çalıştırın. Tekrar-güvenli yazıldı.
-- Mevcut RLS / business_id / current_business_id() mantığına dokunmaz,
-- üstüne inşa eder.
-- =============================================================

-- =============================================================
-- 1) expenses — gider defteri (net kâr = tahsilat - gider)
-- =============================================================

create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  title        text not null,
  category     text not null default 'diger'
    check (category in (
      'kira', 'maas', 'malzeme', 'fatura', 'pazarlama', 'vergi', 'diger'
    )),
  amount       numeric not null check (amount >= 0),
  spent_at     date not null default (now() at time zone 'utc')::date,
  method       text not null default 'nakit'
    check (method in ('nakit', 'kart', 'havale', 'diger')),
  note         text,
  created_by   uuid references public.profiles(id)
);

create index if not exists idx_expenses_business_spent
  on public.expenses(business_id, spent_at desc);

alter table public.expenses enable row level security;

drop policy if exists "expenses_all_same_business" on public.expenses;
create policy "expenses_all_same_business"
  on public.expenses for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- =============================================================
-- 2) staff — personel (giriş hesabı olması zorunlu değil)
-- =============================================================

create table if not exists public.staff (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  full_name       text not null,
  title           text,                 -- ünvan: kuaför, terapist, danışman...
  phone           text,
  email           text,
  commission_rate numeric not null default 0 check (commission_rate >= 0),
  is_active       boolean not null default true,
  note            text
);

create index if not exists idx_staff_business
  on public.staff(business_id);

alter table public.staff enable row level security;

drop policy if exists "staff_all_same_business" on public.staff;
create policy "staff_all_same_business"
  on public.staff for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- =============================================================
-- 3) appointments — personel ataması
--    (mevcut staff_id profiles'a bağlıydı; bu yeni alan staff tablosuna bağlanır)
-- =============================================================

alter table public.appointments
  add column if not exists staff_member_id uuid references public.staff(id);

create index if not exists idx_appointments_staff_member
  on public.appointments(staff_member_id);
