-- =============================================================
-- 0019_anamnesis.sql
-- Müşteri sağlık bilgisi (anamnez formu).
--
-- Lazer, cilt ve estetik işlemlerde alerji/ilaç/hamilelik bilgisi
-- hem tıbbi hem yasal zorunluluk. Şu ana kadar yalnızca serbest
-- `customers.note` alanı vardı.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

create table if not exists public.customer_health (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  customer_id   uuid not null unique references public.customers(id) on delete cascade,

  allergies     text[] not null default '{}',
  medications   text,
  conditions    text[] not null default '{}',
  is_pregnant   boolean not null default false,
  -- kuru / yağlı / karma / hassas / normal
  skin_type     text,
  notes         text,

  updated_by    uuid references public.profiles(id) on delete set null
);

alter table public.customer_health enable row level security;

drop policy if exists "customer_health_all_same_business" on public.customer_health;
create policy "customer_health_all_same_business"
  on public.customer_health for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_customer_health_customer
  on public.customer_health(customer_id);

create or replace function public.touch_customer_health()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_customer_health_updated on public.customer_health;
create trigger on_customer_health_updated
  before update on public.customer_health
  for each row
  execute function public.touch_customer_health();

-- Randevu ekranında uyarı rozeti için hızlı bayrak
alter table public.customers
  add column if not exists has_health_alert boolean not null default false;

-- Alerji/hamilelik/kronik durum varsa bayrağı aç
create or replace function public.sync_health_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customers
    set has_health_alert = (
      coalesce(array_length(new.allergies, 1), 0) > 0
      or coalesce(array_length(new.conditions, 1), 0) > 0
      or new.is_pregnant
    )
    where id = new.customer_id;
  return new;
end;
$$;

drop trigger if exists on_health_alert_sync on public.customer_health;
create trigger on_health_alert_sync
  after insert or update on public.customer_health
  for each row
  execute function public.sync_health_alert();
