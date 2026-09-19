-- =============================================================
-- 0017_business_audit.sql
-- İşletme içi denetim kaydı.
--
-- platform_audit_log (0012) yalnızca platform admini işlemlerini tutuyor.
-- Firma içinde "kim neyi sildi/değiştirdi" izi hiç yoktu: personel bir
-- ödemeyi silerse hiçbir kayıt kalmıyordu.
--
-- Okuma yalnızca işletme sahibinde; yazma tüm oturum sahiplerinde
-- (kendi işlemini loglar), silme/güncelleme kimsede yok (değiştirilemez iz).
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

create table if not exists public.business_audit_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  -- Kullanıcı silinse bile kim olduğu kalsın (anlık kopya)
  actor_label text not null,
  action      text not null,
  -- Etkilenen kayıt (musteri, odeme, gider, paket, randevu, personel, ayarlar…)
  entity      text not null,
  entity_id   uuid,
  -- İnsan okunabilir özet: "Ayşe Yılmaz" / "₺2.000 nakit"
  summary     text,
  detail      jsonb not null default '{}'::jsonb
);

alter table public.business_audit_log enable row level security;

-- Okuma: yalnızca işletme sahibi
drop policy if exists "business_audit_select_owner" on public.business_audit_log;
create policy "business_audit_select_owner"
  on public.business_audit_log for select to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());

-- Yazma: kendi işletmesine, herkes (işlemini loglar)
drop policy if exists "business_audit_insert_own" on public.business_audit_log;
create policy "business_audit_insert_own"
  on public.business_audit_log for insert to authenticated
  with check (business_id = public.current_business_id());

-- Güncelleme/silme politikası YOK → iz değiştirilemez.

create index if not exists idx_business_audit_business
  on public.business_audit_log(business_id, created_at desc);
create index if not exists idx_business_audit_entity
  on public.business_audit_log(business_id, entity, entity_id);
