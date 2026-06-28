-- =============================================================
-- 0012_audit_log.sql
-- Ajans işlem geçmişi (audit log): hangi admin neyi ne zaman yaptı.
--
-- Kayıtlar yalnızca server action'larda service_role ile eklenir.
-- Okuma yalnızca KURUCU (is_platform_owner) için.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

create table if not exists public.platform_audit_log (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  actor_id      uuid,
  actor_name    text,
  action        text not null,
  business_id   uuid,
  business_name text,
  detail        text
);

create index if not exists idx_audit_created on public.platform_audit_log(created_at desc);

alter table public.platform_audit_log enable row level security;

-- Okuma: yalnızca kurucu
drop policy if exists "audit_select_owner" on public.platform_audit_log;
create policy "audit_select_owner"
  on public.platform_audit_log for select to authenticated
  using (public.is_platform_owner());

-- Yazma: yalnızca service_role (server action) — politika eklenmez, RLS varsayılan engeller.
