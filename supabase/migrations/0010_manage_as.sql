-- =============================================================
-- 0010_manage_as.sql
-- Süper-admin "yönetici olarak gir" (read-WRITE impersonation)
--
-- 0009 yalnızca OKUMA daraltması ekledi (görüntüleyici/read-only).
-- Bu migration, süper-admin İSTERSE bir firmayı YÖNETEBİLSİN (yazsın) diye
-- ek YAZMA politikaları ekler — AMA yalnızca:
--   1) süper-admin ise (is_super_admin())
--   2) o firmayı görüntülüyorsa (business_id = acting_business_id())
--   3) "yönet" modundaysa (x-acting-write: '1' başlığı → acting_can_write())
--
-- ⚠️ GÜVENLİK: Normal firma kullanıcılarının mevcut politikaları DEĞİŞMEZ
-- (eklenen politikalar is_super_admin() ile kapılı, additive). "Görüntüle"
-- modunda x-acting-write başlığı GÖNDERİLMEZ → acting_can_write() false →
-- süper-admin yazamaz (salt-okunur korunur). Yazma yalnızca "Yönet" modunda.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- 'x-acting-write' başlığı '1' ise true (yönet modu)
create or replace function public.acting_can_write()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h text;
begin
  begin
    h := current_setting('request.headers', true)::json ->> 'x-acting-write';
  exception when others then
    return false;
  end;
  return h = '1';
end;
$$;

grant execute on function public.acting_can_write() to authenticated;

-- Tenant veri tabloları: süper-admin YÖNET modunda tam yetki (yalnızca acting firma)
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
      execute format('drop policy if exists %I on public.%I', t || '_manage_super', t);
      execute format(
        'create policy %I on public.%I for all to authenticated using (public.is_super_admin() and business_id = public.acting_business_id() and public.acting_can_write()) with check (public.is_super_admin() and business_id = public.acting_business_id() and public.acting_can_write())',
        t || '_manage_super', t
      );
    end if;
  end loop;
end$$;

-- businesses: yönet modunda firma ayarlarını (Ayarlar sayfası) güncelleyebilsin
drop policy if exists "businesses_manage_super" on public.businesses;
create policy "businesses_manage_super"
  on public.businesses for update to authenticated
  using (public.is_super_admin() and id = public.acting_business_id() and public.acting_can_write())
  with check (public.is_super_admin() and id = public.acting_business_id() and public.acting_can_write());
