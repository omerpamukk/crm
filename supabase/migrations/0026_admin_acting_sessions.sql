-- =============================================================
-- 0026_admin_acting_sessions.sql
-- Güvenlik: "firmaya gir" (view/manage) yetkisini istemci başlığından
-- SUNUCU TARAFLI oturum tablosuna taşır. Dayanır: 0008, 0009, 0010, 0011.
--
-- KAPATTIĞI AÇIK:
--   0009/0010'da acting_business_id() ve acting_can_write() yalnızca
--   'x-acting-business' / 'x-acting-write' HTTP başlıklarına bakıyordu.
--   Başlığı istemci gönderebildiği için "goruntule" yetkili herhangi bir
--   ekip üyesi kendi JWT'siyle PostgREST'e başlığı ekleyip HERHANGİ bir
--   firmaya yazabiliyordu (is_super_admin() de yetki farkı gözetmiyor).
--
-- YENİ MODEL:
--   • admin_acting_sessions: admin başına tek satır (user_id pk). Yazma
--     yalnızca service_role ile (server action, yetki kontrolünden sonra).
--   • acting_business_id(): auth.uid() için, süresi dolmamış satırdan okur;
--     mod 'manage' ise 'yonet', 'view' ise 'goruntule' yetkisi şart.
--   • acting_can_write(): satır mode='manage', süresi dolmamış VE
--     has_admin_perm('yonet') (kurucu dahil) ise true.
--   • Fonksiyon imzaları aynı → 0009/0010'daki politikalar DEĞİŞMEDİ,
--     otomatik olarak yeni kaynağı kullanır.
--   • Tarayıcı istemcisi de artık doğru daraltılır (başlığa bağlı değil).
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

create table if not exists public.admin_acting_sessions (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  mode        text not null check (mode in ('view', 'manage')),
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists admin_acting_sessions_business_idx
  on public.admin_acting_sessions (business_id);

alter table public.admin_acting_sessions enable row level security;

-- Yalnızca kendi satırını OKUYABİLİR (UI bağlamı için). Yazma politikası YOK.
drop policy if exists "admin_acting_sessions_select_own" on public.admin_acting_sessions;
create policy "admin_acting_sessions_select_own"
  on public.admin_acting_sessions for select to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.admin_acting_sessions from anon, authenticated;

-- Aktif firma: başlık yerine sunucu tablosundan
create or replace function public.acting_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.business_id
  from public.admin_acting_sessions s
  where s.user_id = auth.uid()
    and s.expires_at > now()
    and public.has_admin_perm(case s.mode when 'manage' then 'yonet' else 'goruntule' end)
  limit 1;
$$;
grant execute on function public.acting_business_id() to authenticated;

-- Yazma izni: yalnızca 'manage' oturumu + 'yonet' yetkisi
create or replace function public.acting_can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_acting_sessions s
    where s.user_id = auth.uid()
      and s.mode = 'manage'
      and s.expires_at > now()
      and public.has_admin_perm('yonet')
  );
$$;
grant execute on function public.acting_can_write() to authenticated;
