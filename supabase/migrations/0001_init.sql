-- =============================================================
-- 0001_init.sql
-- Çok-kiracılı (multi-tenant) CRM şeması + RLS politikaları
-- Bu dosyayı Supabase SQL Editor'da elle çalıştırın.
-- Kiracı (tenant) sınırı: businesses.id  →  profiles.business_id
-- =============================================================

-- gen_random_uuid() için (Supabase'de genelde zaten kuruludur)
create extension if not exists pgcrypto;

-- =============================================================
-- TABLOLAR
-- =============================================================

-- İşletmeler (kiracı kök tablosu)
create table public.businesses (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  sector     text
);

-- Kullanıcı profilleri (auth.users ile 1-1)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  business_id uuid references public.businesses(id),
  full_name   text,
  role        text check (role in ('owner','staff')) default 'staff'
);

-- Müşteriler
create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  business_id   uuid not null references public.businesses(id),
  full_name     text not null,
  phone         text,
  email         text,
  source        text,
  tags          text[],
  note          text,
  status        text default 'new',
  last_visit_at timestamptz,
  birthday      date
);

-- Hizmetler
create table public.services (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  business_id  uuid not null references public.businesses(id),
  name         text not null,
  duration_min int,
  price        numeric,
  category     text
);

-- Randevular
create table public.appointments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id),
  customer_id uuid references public.customers(id),
  service_id  uuid references public.services(id),
  starts_at   timestamptz not null,
  staff_id    uuid references public.profiles(id),
  status      text default 'planned',
  note        text
);

-- Paketler (seans paketleri)
create table public.packages (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  business_id        uuid not null references public.businesses(id),
  customer_id        uuid references public.customers(id),
  service_name       text,
  total_sessions     int,
  remaining_sessions int,
  purchased_at       timestamptz,
  price              numeric
);

-- Sık kullanılan filtre kolonları için indeksler
create index idx_profiles_business     on public.profiles(business_id);
create index idx_customers_business    on public.customers(business_id);
create index idx_services_business     on public.services(business_id);
create index idx_appointments_business on public.appointments(business_id);
create index idx_appointments_starts   on public.appointments(starts_at);
create index idx_packages_business     on public.packages(business_id);

-- =============================================================
-- YENİ KULLANICI TRIGGER'I
-- auth.users'a yeni satır eklenince profiles'a otomatik satır açar.
-- id eşleşir, role varsayılan olarak 'owner' atanır.
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'owner'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =============================================================
-- YARDIMCI FONKSIYON: current_business_id()
-- Giriş yapan kullanıcının profiles.business_id değerini döndürür.
-- security definer → profiles üzerindeki RLS'i atlar (özyineleme önler).
-- =============================================================

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id
  from public.profiles
  where id = auth.uid();
$$;

grant execute on function public.current_business_id() to authenticated;

-- =============================================================
-- RLS — tüm tablolarda açık
-- =============================================================

alter table public.businesses   enable row level security;
alter table public.profiles      enable row level security;
alter table public.customers     enable row level security;
alter table public.services      enable row level security;
alter table public.appointments  enable row level security;
alter table public.packages      enable row level security;

-- ---------- businesses ----------
-- Kullanıcı yalnızca kendi işletmesini görebilir/güncelleyebilir.
create policy "businesses_select_own"
  on public.businesses for select to authenticated
  using (id = public.current_business_id());

create policy "businesses_update_own"
  on public.businesses for update to authenticated
  using (id = public.current_business_id())
  with check (id = public.current_business_id());

-- Onboarding: yeni bir owner ilk işletmesini oluşturabilsin.
-- (Spec'te yok; işletme kaydı olmadan kiracı başlatılamayacağı için eklendi.
--  İstemiyorsanız bu politikayı kaldırabilirsiniz.)
create policy "businesses_insert_authenticated"
  on public.businesses for insert to authenticated
  with check (true);

-- ---------- profiles ----------
-- Kullanıcı kendi işletmesindeki profilleri (ve her zaman kendi satırını) görebilir.
create policy "profiles_select_same_business"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or business_id = public.current_business_id()
  );

-- Kullanıcı yalnızca kendi profilini güncelleyebilir.
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- customers ----------
create policy "customers_all_same_business"
  on public.customers for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- ---------- services ----------
create policy "services_all_same_business"
  on public.services for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- ---------- appointments ----------
create policy "appointments_all_same_business"
  on public.appointments for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- ---------- packages ----------
create policy "packages_all_same_business"
  on public.packages for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());
