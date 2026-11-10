-- =============================================================
-- randevu-saat-tani.sql  —  YALNIZCA SELECT, hiçbir şeyi değiştirmez.
-- Randevu saati dilimi sorununun canlı veride ne kadar yer tuttuğunu gösterir.
-- Supabase SQL Editor'da bölümleri tek tek (her SELECT ayrı) çalıştırın.
-- 0029 öncesi de sonrası da çalışır (tz_normalized yoksa boş/NULL görünür).
--
-- Mantık: Panel formu ofsetsiz saat gönderdiği için "14:00" girilen kayıt
-- 14:00Z (UTC) saklandı = fiilen 17:00 TR. Online randevu doğru yazıldı.
--   Panel kaydı (booked_online = false): çalışma saatleri 09–19 -> UTC 09–19
--   Online kayıt  (booked_online = true) : çalışma saatleri 09–19 -> UTC 06–16
-- =============================================================

-- 1) ORTAM — varsayım kontrolü. Beklenen: TimeZone = UTC ve rol/veritabanı
--    için UTC dışında bir timezone ayarı OLMAMASI. Burada başka bir şey
--    görürseniz 0030 zaten çalışmayı reddeder; bana haber verin.
select current_setting('TimeZone') as oturum_saat_dilimi, now() as simdi_utc;

select coalesce(r.rolname, '(tüm roller)') as rol, s.setdatabase, cfg as ayar
from pg_db_role_setting s
left join pg_roles r on r.oid = s.setrole
cross join lateral unnest(s.setconfig) as cfg
where lower(cfg) like '%timezone%';

select timezone as firma_saat_dilimi, count(*) as firma_sayisi
from public.businesses group by 1 order by 2 desc;

-- 2) FİRMA BAŞINA RANDEVU SAYISI ve kaynağa göre dağılım
--    panel = formdan girilen (kaymış olabilir), online = randevu linkinden (doğru)
select
  b.name as firma,
  count(*)                                              as toplam,
  count(*) filter (where not coalesce(a.booked_online, false)) as panel,
  count(*) filter (where coalesce(a.booked_online, false))     as online,
  count(*) filter (where (to_jsonb(a)->>'tz_normalized') = 'true')  as dogru_isaretli_0029_sonrasi,
  min(a.created_at)::date as ilk_giris,
  max(a.created_at)::date as son_giris
from public.appointments a
join public.businesses b on b.id = a.business_id
group by b.name
order by toplam desc;

-- 3) UTC SAATİNE GÖRE HİSTOGRAM (kaynağa göre ayrı)
--    Panel kayıtları 09–19 UTC civarında, online kayıtlar 06–16 UTC civarında
--    toplanıyorsa teşhis doğrudur.
select
  extract(hour from a.starts_at at time zone 'UTC')::int as utc_saat,
  count(*) filter (where not coalesce(a.booked_online, false)) as panel,
  count(*) filter (where coalesce(a.booked_online, false))     as online
from public.appointments a
group by 1 order by 1;

-- 4) HİPOTEZ TESTİ — firmanın randevu linki çalışma saatlerine (booking_settings)
--    göre her PANEL kaydı iki varsayımla sınanır:
--      naif_uyar   : saklanan UTC saati duvar saati sayarsak çalışma saatine uyar mı
--      dogru_uyar  : saklanan an İstanbul saatine çevrilirse çalışma saatine uyar mı
--    "sadece_naif" yüksek, "sadece_dogru" ~0 ise kaymayı kanıtlar. "sadece_dogru"
--    sıfırdan büyükse o kayıtlar 0030 ile YANLIŞLIKLA kaydırılabilir; aşağıdaki
--    5. sorgudan tek tek bakın. (Yalnızca booking_settings'i olan firmalar.)
with k as (
  select
    a.id, a.business_id,
    to_char(a.starts_at at time zone 'UTC', 'HH24:MI')             as naif,
    to_char(a.starts_at at time zone 'Europe/Istanbul', 'HH24:MI') as dogru,
    bs.start_time, bs.end_time
  from public.appointments a
  join public.booking_settings bs on bs.business_id = a.business_id
  where not coalesce(a.booked_online, false)
)
select
  b.name as firma,
  count(*) as panel_kaydi,
  count(*) filter (where naif >= start_time and naif < end_time and not (dogru >= start_time and dogru < end_time)) as sadece_naif,
  count(*) filter (where dogru >= start_time and dogru < end_time and not (naif >= start_time and naif < end_time)) as sadece_dogru,
  count(*) filter (where naif >= start_time and naif < end_time and dogru >= start_time and dogru < end_time)       as ikisi_de,
  count(*) filter (where not (naif >= start_time and naif < end_time) and not (dogru >= start_time and dogru < end_time)) as hicbiri
from k join public.businesses b on b.id = k.business_id
group by b.name order by panel_kaydi desc;

-- 5) ŞÜPHELİ KAYITLAR — 0030'un kaydıracağı panel kayıtlarından, saklanan UTC
--    saati çalışma saati DIŞINDA ama İstanbul saatine çevirince İÇİNDE kalanlar
--    (yani zaten doğru yazılmış olabilir). Boş dönmesi beklenir. Dolu dönerse
--    0030'u çalıştırmadan önce bu kayıtlara bakın.
--    (Hariç firma 'deneme' listelenmez: 0030 onu zaten kaydırmaz.)
select
  b.name as firma, a.id, a.created_at,
  a.starts_at as saklanan_an_utc,
  to_char(a.starts_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI') as istanbul_saati,
  to_char(a.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI')             as utc_duvar_saati,
  bs.start_time, bs.end_time
from public.appointments a
join public.businesses b on b.id = a.business_id
join public.booking_settings bs on bs.business_id = a.business_id
where not coalesce(a.booked_online, false)
  and b.name <> 'deneme'
  and (to_jsonb(a)->>'tz_normalized') is distinct from 'true'
  and to_char(a.starts_at at time zone 'Europe/Istanbul', 'HH24:MI') >= bs.start_time
  and to_char(a.starts_at at time zone 'Europe/Istanbul', 'HH24:MI') <  bs.end_time
  and not (to_char(a.starts_at at time zone 'UTC', 'HH24:MI') >= bs.start_time
       and to_char(a.starts_at at time zone 'UTC', 'HH24:MI') <  bs.end_time)
order by b.name, a.starts_at
limit 200;

-- 6) 0030 ÖNİZLEME — Ne değişecek? (0029 çalıştıktan sonra tz_normalized = false
--    olanlar; 0029 öncesi: tüm panel kayıtları, 'deneme' hariç.)
--    "once" ve "sonra" İstanbul saatiyle gösterilir.
select
  b.name as firma,
  count(*) as degisecek_randevu
from public.appointments a
join public.businesses b on b.id = a.business_id
where coalesce((to_jsonb(a)->>'tz_normalized'), 'false') <> 'true'
  and not coalesce(a.booked_online, false)
  and b.name <> 'deneme'
group by b.name order by 2 desc;

select
  b.name as firma, a.id,
  to_char(a.starts_at at time zone 'Europe/Istanbul', 'YYYY-MM-DD HH24:MI')            as ekranda_simdi_gorunen,
  to_char(a.starts_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI')                       as duzeltme_sonrasi_gorunecek,
  a.status
from public.appointments a
join public.businesses b on b.id = a.business_id
where coalesce((to_jsonb(a)->>'tz_normalized'), 'false') <> 'true'
  and not coalesce(a.booked_online, false)
  and b.name <> 'deneme'
order by a.starts_at desc
limit 20;

-- 7) 'deneme' FİRMASI — örnek veri (doğru) ile elle girilenler (kaymış olabilir)
--    karışık. Örnek veri imzası: created_at = starts_at - 2 gün (tam eşit).
--    0030 bu firmaya dokunmaz. Elle girilen kayıt sayısı > 0 ise örnek veriyi
--    silip yeniden yüklemek en temizi.
select
  count(*) as toplam,
  count(*) filter (where a.created_at = a.starts_at - interval '2 days') as ornek_veri_imzali,
  count(*) filter (where a.created_at <> a.starts_at - interval '2 days'
                   and not coalesce(a.booked_online, false)) as olasi_elle_girilen
from public.appointments a
join public.businesses b on b.id = a.business_id
where b.name = 'deneme';

-- 8) DİĞER SAATLİ ALANLAR (bilgi amaçlı, 0030 bunlara dokunmaz)
--    Görevlerin bitiş zamanı panelde ofsetsiz yazıldı (aynı hata) ve ekranda
--    tarayıcı saatiyle okundu; kayıtlar bu yüzden tutarsız olabilir. Otomatik
--    düzeltme güvenli değil: kullanıcılar 3 saat farkı elle telafi etmiş olabilir.
select b.name as firma, count(*) as bitis_zamani_olan_gorev,
       min(t.due_at) as en_eski, max(t.due_at) as en_yeni
from public.tasks t join public.businesses b on b.id = t.business_id
where t.due_at is not null
group by b.name order by 2 desc;

select count(*) as izin_kaydi from public.staff_time_off;  -- arayüzden yazılmıyor; elle/örnek veri

-- 9) 0030 SONRASI DOĞRULAMA (yalnızca 0029 ve 0030 çalıştıktan sonra çalışır) — beklenen: kalan_dogrulanmamis = 0
select
  count(*) filter (where tz_normalized = false) as kalan_dogrulanmamis,
  count(*) filter (where tz_normalized = true)  as dogru_isaretli,
  (select count(*) from public.appointments_saat_yedek_0030) as yedeklenen
from public.appointments;
