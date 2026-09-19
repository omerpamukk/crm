-- =============================================================
-- 0018_storage_media.sql
-- Supabase Storage + müşteri medyası (öncesi/sonrası fotoğraf).
--
-- Storage hiç kullanılmıyordu. Öncesi/sonrası fotoğraf bir güzellik
-- merkezinin en temel satış aracı; logo yükleme de buna bağlı.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- =============================================================
-- 1) Bucket'lar
--    business-logos: herkese açık okuma (site/randevu linkinde görünür)
--    customer-media: gizli; yalnızca kendi firması erişir
-- =============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('business-logos', 'business-logos', true, 2097152,
   array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('customer-media', 'customer-media', false, 10485760,
   array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict (id) do nothing;

-- =============================================================
-- 2) customer_media — fotoğraf/belge kayıtları
-- =============================================================
create table if not exists public.customer_media (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  customer_id    uuid not null references public.customers(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  -- Storage yolu: <business_id>/<customer_id>/<dosya>
  path           text not null,
  kind           text not null check (kind in ('before', 'after', 'document')),
  taken_at       timestamptz not null default now(),
  note           text,
  created_by     uuid references public.profiles(id) on delete set null
);

alter table public.customer_media enable row level security;

drop policy if exists "customer_media_all_same_business" on public.customer_media;
create policy "customer_media_all_same_business"
  on public.customer_media for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_customer_media_customer
  on public.customer_media(customer_id, taken_at desc);

-- =============================================================
-- 3) Storage RLS — yol ilk klasörü business_id olmalı
--    Böylece bir firma başka firmanın dosyasına erişemez.
-- =============================================================
drop policy if exists "customer_media_read_own_business" on storage.objects;
create policy "customer_media_read_own_business"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-media'
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );

drop policy if exists "customer_media_write_own_business" on storage.objects;
create policy "customer_media_write_own_business"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'customer-media'
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );

drop policy if exists "customer_media_delete_own_business" on storage.objects;
create policy "customer_media_delete_own_business"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'customer-media'
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );

-- Logolar: okuma herkese açık (bucket public), yazma kendi firmasına
drop policy if exists "business_logos_write_own" on storage.objects;
create policy "business_logos_write_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );

drop policy if exists "business_logos_update_own" on storage.objects;
create policy "business_logos_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );

drop policy if exists "business_logos_delete_own" on storage.objects;
create policy "business_logos_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );
