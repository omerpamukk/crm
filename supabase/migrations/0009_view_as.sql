-- =============================================================
-- 0009_view_as.sql
-- Süper-admin "görüntüleyici olarak gir" (impersonation) — READ ONLY
--
-- YÖNTEM: İstemci, bir firmayı görüntülerken 'x-acting-business' HTTP başlığı
-- gönderir. acting_business_id() bu başlığı okur. Süper-admin SELECT politikaları
-- başlık varsa okumayı o firmaya DARALTIR, yoksa (örn. /admin) hepsini gösterir.
--
-- ⚠️ GÜVENLİK: Bu yalnızca SELECT politikalarını değiştirir. Yazma (insert/update/
-- delete) politikaları DEĞİŞMEZ — onlar hâlâ business_id = current_business_id()
-- ister. current_business_id() süper-adminin KENDİ business_id'sini döndürdüğü için
-- (başlığı DEĞİL), süper-admin görüntülediği firmaya YAZAMAZ. Salt-okunur DB'de garanti.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- 'x-acting-business' başlığını güvenli biçimde uuid'e çevirir (yoksa/bozuksa null)
create or replace function public.acting_business_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h text;
begin
  begin
    h := current_setting('request.headers', true)::json ->> 'x-acting-business';
  exception when others then
    return null;
  end;
  if h is null or h = '' then
    return null;
  end if;
  begin
    return h::uuid;
  exception when others then
    return null;
  end;
end;
$$;

grant execute on function public.acting_business_id() to authenticated;

-- Tenant tabloları: süper-admin SELECT politikalarını başlık-duyarlı yap
do $$
declare
  t text;
  tt text[] := array[
    'customers','services','appointments','packages','payments','interactions',
    'pipeline_stages','expenses','staff','booking_settings','agency_access'
  ];
begin
  foreach t in array tt loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists %I on public.%I', t || '_select_super', t);
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.is_super_admin() and (public.acting_business_id() is null or business_id = public.acting_business_id()))',
        t || '_select_super', t
      );
    end if;
  end loop;
end$$;

-- businesses: id ile daralt
drop policy if exists "businesses_select_super" on public.businesses;
create policy "businesses_select_super"
  on public.businesses for select to authenticated
  using (public.is_super_admin() and (public.acting_business_id() is null or id = public.acting_business_id()));

-- profiles: business_id ile daralt
drop policy if exists "profiles_select_super" on public.profiles;
create policy "profiles_select_super"
  on public.profiles for select to authenticated
  using (public.is_super_admin() and (public.acting_business_id() is null or business_id = public.acting_business_id()));
