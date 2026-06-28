-- =============================================================
-- 0008_platform_admin.sql
-- Süper-admin (ajans) platform yetkisi + abonelik + RLS istisnaları
--
-- GÜVENLİK İLKESİ: Mevcut "business_id = current_business_id()" izolasyon
-- politikalarına DOKUNULMAZ. Süper-admin için her tabloya AYRI, EK bir
-- SELECT-only politikası eklenir (permissive OR). Böylece normal firma
-- kullanıcısının erişimi hiç değişmez — yalnızca süper-admin ek okuma kazanır.
-- Süper-admin firma verisine YAZAMAZ (read-only impersonation).
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- NOT: 0006/0007 zaten kullanıldığı için bu migration 0008'dir.
-- =============================================================

-- =============================================================
-- 1) platform_admins — süper-admin (ajans) kullanıcıları
-- =============================================================
create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- =============================================================
-- 2) is_super_admin() — SECURITY DEFINER (platform_admins'i RLS'siz okur)
-- =============================================================
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

grant execute on function public.is_super_admin() to authenticated;

alter table public.platform_admins enable row level security;
drop policy if exists "platform_admins_select_super" on public.platform_admins;
create policy "platform_admins_select_super"
  on public.platform_admins for select to authenticated
  using (public.is_super_admin());

-- =============================================================
-- 3) subscriptions — firma başına abonelik
-- =============================================================
create table if not exists public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  plan        text not null default 'trial',
  status      text not null default 'active' check (status in ('active','trial','suspended','cancelled')),
  price       numeric not null default 0,
  started_at  timestamptz not null default now(),
  expires_at  timestamptz,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Süper-admin tüm aboneliklerde tam yetki
drop policy if exists "subscriptions_super_all" on public.subscriptions;
create policy "subscriptions_super_all"
  on public.subscriptions for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- Firma yalnızca kendi aboneliğini OKUYABİLİR
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own"
  on public.subscriptions for select to authenticated
  using (business_id = public.current_business_id());

-- Mevcut her firma için abonelik kaydı (yoksa) — status 'active'
insert into public.subscriptions (business_id, status, plan)
select b.id, 'active', 'trial'
from public.businesses b
where not exists (select 1 from public.subscriptions s where s.business_id = b.id);

-- =============================================================
-- 4) RLS İSTİSNALARI — süper-admin için EK select-only politikaları
--    (mevcut izolasyon politikaları DEĞİŞMEZ)
-- =============================================================
do $$
declare
  t text;
  tenant_tables text[] := array[
    'customers','services','appointments','packages','payments','interactions',
    'pipeline_stages','expenses','staff','booking_settings','agency_access'
  ];
begin
  foreach t in array tenant_tables loop
    -- Tablo gerçekten varsa politika ekle (idempotent)
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists %I on public.%I', t || '_select_super', t);
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.is_super_admin())',
        t || '_select_super', t
      );
    end if;
  end loop;
end$$;

-- businesses: süper-admin tüm firmaları okuyabilir
drop policy if exists "businesses_select_super" on public.businesses;
create policy "businesses_select_super"
  on public.businesses for select to authenticated
  using (public.is_super_admin());

-- ⚠️ AÇIK KAYDI KAPAT: businesses INSERT artık YALNIZCA süper-admin
--    (eski "herhangi authenticated insert" politikası kaldırılıyor)
drop policy if exists "businesses_insert_authenticated" on public.businesses;
drop policy if exists "businesses_insert_super_admin" on public.businesses;
create policy "businesses_insert_super_admin"
  on public.businesses for insert to authenticated
  with check (public.is_super_admin());

-- profiles: süper-admin tüm profilleri okuyabilir + güncelleyebilir
--   (firma kullanıcısının business_id/rolünü atayabilsin — provisioning)
drop policy if exists "profiles_select_super" on public.profiles;
create policy "profiles_select_super"
  on public.profiles for select to authenticated
  using (public.is_super_admin());

drop policy if exists "profiles_update_super" on public.profiles;
create policy "profiles_update_super"
  on public.profiles for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

-- =============================================================
-- 5) ⚠️ İLK SÜPER-ADMINI ATAMA
-- =============================================================
-- Supabase → Authentication → Users'tan KENDİ user id'ni kopyala ve
-- aşağıdaki satırın yorumunu kaldırıp id'yi yapıştırarak çalıştır.
-- Bu satır olmadan hiçbir kullanıcı süper-admin OLMAZ (güvenli varsayılan).
--
-- insert into public.platform_admins (user_id)
-- values ('BURAYA-KENDI-USER-ID')
-- on conflict (user_id) do nothing;
