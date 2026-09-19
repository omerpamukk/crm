-- =============================================================
-- 0016_kvkk_consents.sql
-- KVKK açık rıza kayıtları — Türkiye'de yasal zorunluluk.
--
-- Şu ana kadar müşteriden alınan hiçbir onay kaydedilmiyordu.
-- Kişisel veri işleme, SMS/e-posta gönderimi ve fotoğraf kullanımı
-- için ayrı ayrı rıza tutulur; her biri geri alınabilir.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

create table if not exists public.consents (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  kind         text not null check (kind in ('kvkk', 'sms', 'email', 'photo')),
  granted      boolean not null default true,
  granted_at   timestamptz not null default now(),
  revoked_at   timestamptz,
  -- Onay metninin hangi sürümü gösterildi (sonradan ispat için)
  text_version text not null default 'v1',
  ip           text,
  source       text not null default 'panel'
                 check (source in ('panel', 'online_booking'))
);

alter table public.consents enable row level security;

drop policy if exists "consents_all_same_business" on public.consents;
create policy "consents_all_same_business"
  on public.consents for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_consents_customer
  on public.consents(customer_id, kind);

-- Aynı müşteri + tür için tek aktif kayıt
create unique index if not exists idx_consents_unique_active
  on public.consents(customer_id, kind) where revoked_at is null;

-- Hızlı filtre için müşteri üzerinde özet alan
alter table public.customers
  add column if not exists kvkk_consent_at timestamptz;

-- consents değişince customers.kvkk_consent_at güncellensin
create or replace function public.sync_kvkk_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'kvkk' then
    update public.customers
      set kvkk_consent_at = case
        when new.granted and new.revoked_at is null then new.granted_at
        else null
      end
      where id = new.customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_consent_changed on public.consents;
create trigger on_consent_changed
  after insert or update on public.consents
  for each row
  execute function public.sync_kvkk_consent();
