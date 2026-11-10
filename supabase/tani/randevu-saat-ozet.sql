-- =============================================================
-- randevu-saat-ozet.sql — YALNIZCA OKUR, hiçbir şeyi değiştirmez.
-- randevu-saat-tani.sql'in 1, 2, 4 ve 5. bölümlerinin tek sorguluk özeti.
-- SQL Editor'da tamamını bir kerede çalıştırın; tek bir tablo döner.
-- Sonuç tablosunu olduğu gibi şefe iletin.
-- =============================================================
with
ortam as (
  select 1 as sira, '1 ortam'::text as bolum, '-'::text as firma,
         'oturum saat dilimi'::text as olcu, current_setting('TimeZone') as deger
  union all
  select 1, '1 ortam', '-', 'rol/veritabanı timezone ayarı sayısı',
         (select count(*) from pg_db_role_setting s
            cross join lateral unnest(s.setconfig) as cfg
           where lower(cfg) like '%timezone%')::text
),
dagilim as (
  select 2 as sira, '2 dağılım'::text as bolum, b.name as firma, x.olcu, x.deger
  from public.businesses b
  join lateral (
    select count(*) as toplam,
           count(*) filter (where not coalesce(a.booked_online, false)) as panel,
           count(*) filter (where coalesce(a.booked_online, false))     as online
    from public.appointments a where a.business_id = b.id
  ) c on c.toplam > 0
  cross join lateral (values
    ('toplam randevu', c.toplam::text),
    ('panelden girilen', c.panel::text),
    ('online linkten', c.online::text)
  ) as x(olcu, deger)
),
k as (
  select a.business_id,
         to_char(a.starts_at at time zone 'UTC', 'HH24:MI')             as naif,
         to_char(a.starts_at at time zone 'Europe/Istanbul', 'HH24:MI') as dogru,
         bs.start_time, bs.end_time
  from public.appointments a
  join public.booking_settings bs on bs.business_id = a.business_id
  where not coalesce(a.booked_online, false)
),
hipotez as (
  select 4 as sira, '4 hipotez (panel kayıtları)'::text as bolum, b.name as firma, x.olcu, x.deger
  from (
    select business_id,
      count(*) filter (where naif >= start_time and naif < end_time and not (dogru >= start_time and dogru < end_time)) as sadece_naif,
      count(*) filter (where dogru >= start_time and dogru < end_time and not (naif >= start_time and naif < end_time)) as sadece_dogru,
      count(*) filter (where naif >= start_time and naif < end_time and dogru >= start_time and dogru < end_time)       as ikisi_de,
      count(*) filter (where not (naif >= start_time and naif < end_time) and not (dogru >= start_time and dogru < end_time)) as hicbiri
    from k group by business_id
  ) h
  join public.businesses b on b.id = h.business_id
  cross join lateral (values
    ('sadece_naif (kaymış görünen)', h.sadece_naif::text),
    ('sadece_dogru (yanlışlıkla kayabilir)', h.sadece_dogru::text),
    ('ikisi_de', h.ikisi_de::text),
    ('hicbiri', h.hicbiri::text)
  ) as x(olcu, deger)
),
supheli as (
  select 5 as sira, '5 şüpheli kayıt'::text as bolum, b.name as firma,
         'şüpheli panel kaydı sayısı'::text as olcu, count(*)::text as deger
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
  group by b.name
)
select bolum, firma, olcu, deger
from (
  select * from ortam
  union all select * from dagilim
  union all select * from hipotez
  union all select * from supheli
) t
order by sira, firma, olcu;
