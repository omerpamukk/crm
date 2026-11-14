-- =============================================================
-- 0043_dosya_yonetici_modu.sql
-- "Firmaya gir · Yönet" modunda logo ve müşteri fotoğrafı yükleme.
--
-- 0018'deki storage kuralları klasörü current_business_id() ile
-- karşılaştırır; yönetici bir firmaya girdiğinde bu, yöneticinin kendi
-- firmasıdır, girdiği firma değil. Bu yüzden yükleme "Logo yüklenemedi"
-- ile reddediliyordu. Tablolardaki *_manage_super kurallarının (0010)
-- aynısı storage için eklenir: yalnızca süper-admin, yalnızca girdiği
-- firmanın klasörü, yalnızca Yönet modunda (acting_can_write, 0026).
--
-- Firma kullanıcılarının mevcut kuralları değişmez (eklemeli).
-- Tekrar-güvenli. Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

drop policy if exists "business_logos_write_acting" on storage.objects;
create policy "business_logos_write_acting"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-logos'
    and public.is_super_admin()
    and public.acting_can_write()
    and (storage.foldername(name))[1] = public.acting_business_id()::text
  );

drop policy if exists "business_logos_update_acting" on storage.objects;
create policy "business_logos_update_acting"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'business-logos'
    and public.is_super_admin()
    and public.acting_can_write()
    and (storage.foldername(name))[1] = public.acting_business_id()::text
  );

drop policy if exists "business_logos_delete_acting" on storage.objects;
create policy "business_logos_delete_acting"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-logos'
    and public.is_super_admin()
    and public.acting_can_write()
    and (storage.foldername(name))[1] = public.acting_business_id()::text
  );

drop policy if exists "customer_media_read_acting" on storage.objects;
create policy "customer_media_read_acting"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'customer-media'
    and public.is_super_admin()
    and (storage.foldername(name))[1] = public.acting_business_id()::text
  );

drop policy if exists "customer_media_write_acting" on storage.objects;
create policy "customer_media_write_acting"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'customer-media'
    and public.is_super_admin()
    and public.acting_can_write()
    and (storage.foldername(name))[1] = public.acting_business_id()::text
  );

drop policy if exists "customer_media_delete_acting" on storage.objects;
create policy "customer_media_delete_acting"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'customer-media'
    and public.is_super_admin()
    and public.acting_can_write()
    and (storage.foldername(name))[1] = public.acting_business_id()::text
  );
