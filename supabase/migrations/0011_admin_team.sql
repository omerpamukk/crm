-- =============================================================
-- 0011_admin_team.sql
-- Ajans ekibi: kurucu süper-admin + sınırlı yetkili ek adminler
--
-- HİYERARŞİ:
--   • is_owner = true  → KURUCU (elle eklenen). Tam yetki; ekip yönetir.
--   • is_owner = false → EK ADMIN. Yalnızca kurucunun verdiği yetkiler.
--     Admin ekibiyle (kurucu dahil) ilgili HİÇBİR ŞEY yapamaz.
--
-- Yetki anahtarları (permissions text[]):
--   goruntule, yonet, firma_olustur, firma_duzenle, abonelik, kullanici_yonet
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

alter table public.platform_admins
  add column if not exists full_name   text,
  add column if not exists is_owner    boolean not null default false,
  add column if not exists permissions text[] not null default '{}',
  add column if not exists created_by  uuid;

-- Mevcut (elle eklenen) adminleri KURUCU yap — onlar güvenilir kurucular.
update public.platform_admins set is_owner = true where is_owner is distinct from true;

-- Kurucu mu?
create or replace function public.is_platform_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid() and is_owner = true);
$$;
grant execute on function public.is_platform_owner() to authenticated;

-- Belirli bir admin yetkisi var mı? (kurucu → her zaman true)
create or replace function public.has_admin_perm(p text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins
    where user_id = auth.uid()
      and (is_owner = true or p = any(permissions))
  );
$$;
grant execute on function public.has_admin_perm(text) to authenticated;

-- RLS: admin kendi satırını okuyabilir (yetkilerini bilsin); kurucu hepsini okur.
-- Yazma (ekip yönetimi) yalnızca server action + service_role ile yapılır.
drop policy if exists "platform_admins_select_super" on public.platform_admins;
drop policy if exists "platform_admins_select_self_owner" on public.platform_admins;
create policy "platform_admins_select_self_owner"
  on public.platform_admins for select to authenticated
  using (user_id = auth.uid() or public.is_platform_owner());
