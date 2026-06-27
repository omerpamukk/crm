-- =============================================================
-- 0007_foundations.sql
-- FAZ 1/2 temeli: işletme markalama alanları + performans indeksleri
-- + customer_summary view (Müşteri 360 ve raporlar için).
--
-- Mevcut RLS / business_id / current_business_id() mantığına DOKUNMAZ.
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- =============================================================
-- 1) businesses — markalama / işletme ayarları alanları
-- =============================================================
alter table public.businesses
  add column if not exists logo_url      text,
  add column if not exists phone         text,
  add column if not exists address       text,
  add column if not exists email         text,
  add column if not exists currency      text not null default 'TRY',
  add column if not exists timezone      text not null default 'Europe/Istanbul',
  add column if not exists working_hours jsonb not null default '{}'::jsonb,
  add column if not exists slug          text,
  add column if not exists updated_at    timestamptz not null default now();

-- slug benzersiz olsun (public randevu /r/[slug] için) — yalnızca dolu olanlarda
create unique index if not exists idx_businesses_slug
  on public.businesses(slug) where slug is not null;

-- =============================================================
-- 2) Performans indeksleri (sık filtrelenen kolonlar) — idempotent
-- =============================================================
create index if not exists idx_customers_last_visit      on public.customers(business_id, last_visit_at);
create index if not exists idx_customers_is_lead          on public.customers(business_id, is_lead);
create index if not exists idx_appointments_customer      on public.appointments(customer_id);
create index if not exists idx_appointments_status_starts on public.appointments(business_id, status, starts_at);
create index if not exists idx_payments_customer          on public.payments(customer_id);
create index if not exists idx_packages_customer          on public.packages(customer_id);
create index if not exists idx_interactions_business      on public.interactions(business_id, created_at desc);

-- =============================================================
-- 3) customer_summary — müşteri başına özet (360 + raporlar)
--    security_invoker: sorgulayan kullanıcının RLS'i uygulanır (çok kiracılık korunur).
-- =============================================================
create or replace view public.customer_summary
with (security_invoker = true) as
select
  c.id                                   as customer_id,
  c.business_id,
  c.full_name,
  -- Yaşam boyu değer: bu müşteriden alınan toplam tahsilat
  coalesce((select sum(pay.amount) from public.payments pay where pay.customer_id = c.id), 0) as total_paid,
  -- Açık borç: paketlerdeki (price - paid_amount) pozitif toplam
  coalesce((select sum(greatest(coalesce(pk.price, 0) - coalesce(pk.paid_amount, 0), 0))
            from public.packages pk where pk.customer_id = c.id), 0) as open_debt,
  -- Toplam randevu sayısı
  (select count(*) from public.appointments a where a.customer_id = c.id) as appointment_count,
  -- Tamamlanan randevu sayısı
  (select count(*) from public.appointments a where a.customer_id = c.id and a.status = 'completed') as completed_count,
  c.last_visit_at
from public.customers c;

grant select on public.customer_summary to authenticated;
