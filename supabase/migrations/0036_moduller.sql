-- =============================================================
-- 0036_moduller.sql
-- İşletme başına açılıp kapatılan modüller (src/lib/modules.ts).
--
-- enabled_modules null  = bu migration'dan önce açılmış işletme; her şeyi
--                         görmeye devam eder (hiçbir müşteri özellik kaybetmez).
-- enabled_modules '{}'  = yeni işletme; paket, online randevu, stok, görevler
--                         kapalı başlar, Ayarlar → Modüller'den açılır.
--
-- Yeni işletmeler admin panelinden '{}' ile açılır (admin/firma-olustur).
-- Tekrar-güvenli. Kullanıcı elle çalıştırır. Önce BU migration, sonra kod.
-- =============================================================

alter table public.businesses
  add column if not exists enabled_modules text[];

comment on column public.businesses.enabled_modules is
  'Açık modüller: paketler, randevu_linki, stok, gorevler. null = hepsi açık (eski işletme).';
