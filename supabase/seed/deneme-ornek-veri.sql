-- =============================================================
-- deneme-ornek-veri.sql
-- "deneme" test firmasına gerçekçi ÖRNEK VERİ ekler (yeni tasarımı dolu
-- ekranlarla denemek için). Migration DEĞİLDİR; Supabase SQL Editor'da elle,
-- bir kez çalıştırılır. Geri almak için: deneme-ornek-veri-sil.sql
--
-- Dayandığı şema: 0001–0028 (özellikle 0001, 0002, 0003, 0004, 0014, 0020, 0021, 0028).
--
-- GÜVENLİK
--   * Yalnızca kimliği 83508721-7be0-49a4-a179-d25ca22c23c7 olan "deneme" firmasına yazar; her satırda business_id
--     bu firmanın kimliğidir. Başka firmaya dokunmaz.
--   * Firma bulunamazsa / birden fazlaysa / firmada zaten veri varsa HİÇBİR ŞEY
--     yazmadan hata verip durur (tekrar çalıştırma güvenlidir).
--   * Tek bir DO bloğu = tek işlem: ya hepsi yazılır ya hiçbiri.
--
-- NE EKLER (yaklaşık)
--   4 personel + vardiyalar, 7 hizmet, 30 müşteri (aktif/yeni/pasif/arşiv),
--   8 lead (pipeline aşamalarına dağılmış), 13 paket (farklı seans kullanımı,
--   taksitli, bitmiş, gecikmiş borçlu), ~700 geçmiş randevu (6 ay), bugün 15 randevu,
--   önümüzdeki 21 gün planlı randevular, tahsilatlar (ciro/grafik için geçmişe
--   tarihli), 4 ay gider, 6 stok ürünü (biri kritik), 9 görev.
--
-- TETİKLEYİCİ KARARLARI (0003 / 0020 / 0021 incelendi)
--   * on_appointment_completed (0003) yalnızca UPDATE'te çalışır; burada
--     randevular doğrudan 'completed' olarak INSERT edildiği için ÇALIŞMAZ.
--     Bu yüzden seans düşümü ve last_visit_at komut dosyasının sonunda tek
--     seferde, gerçek tamamlanmış randevu sayısından hesaplanır (çift düşüm yok).
--   * on_payment_insert (0003) pakete bağlı ödemede paid_amount/payment_status'u
--     kendisi günceller; bu yüzden pakete paid_amount elle YAZILMAZ, yalnızca
--     tarihli ödeme satırı eklenir.
--   * on_stock_movement (0021) stoğu hareketlerden hesaplar; ürünler 0 stokla
--     açılır, giriş/çıkış hareketleri eklenir.
--   * Randevu çakışma kontrolü yalnızca uygulama tarafında çağrılır; tetikleyici
--     değildir. Yine de örnekte aynı uzmanın saatleri çakışmayacak şekilde dizilir.
--
-- DOKUNMAZ: otomasyon kuralları (automations), reminders, message_log,
--   notifications, interactions, integrations. Mesaj gönderimi tetiklenmez.
--   Müşteri telefonları gerçek olmayan "0532 000 00 NN" biçimindedir; e-posta yok.
--
-- ÇALIŞTIRMA SIRASI: (firma doluysa önce -sil.sql) -> bu dosya.
-- =============================================================

do $$
declare
  v_biz     uuid;
  v_n       int;
  v_today   date := (now() at time zone 'Europe/Istanbul')::date;
  v_dom     int  := extract(day from (now() at time zone 'Europe/Istanbul'))::int;
  v_stages  uuid[];
  v_col0    uuid;
  v_col1    uuid;
  v_done    uuid;
  v_cnt_c int; v_cnt_l int; v_cnt_a int; v_cnt_p int; v_cnt_pay int;
  v_cnt_pk int; v_cnt_t int; v_cnt_e int; v_cnt_pr int;
begin
  ---------------------------------------------------------------
  -- 0) Güvenlik kapıları
  ---------------------------------------------------------------
  -- Veritabanında adı "deneme" olan iki firma var; bu yüzden firma adla değil
  -- kimlikle seçilir (ekibin test tarayıcısının açık olduğu firma, 5 Kas 2026).
  v_biz := '83508721-7be0-49a4-a179-d25ca22c23c7';
  select count(*) into v_n from public.businesses where id = v_biz and name = 'deneme';
  if v_n <> 1 then
    raise exception 'Firma bulunamadı ya da adı "deneme" değil (%). Hiçbir şey yazılmadı.', v_biz;
  end if;

  if (select count(*) from public.customers    where business_id = v_biz) > 0
  or (select count(*) from public.appointments where business_id = v_biz) > 0
  or (select count(*) from public.packages     where business_id = v_biz) > 0
  or (select count(*) from public.payments     where business_id = v_biz) > 0
  or (select count(*) from public.services     where business_id = v_biz) > 0
  or (select count(*) from public.staff        where business_id = v_biz) > 0
  or (select count(*) from public.expenses     where business_id = v_biz) > 0
  or (select count(*) from public.products     where business_id = v_biz) > 0
  or (select count(*) from public.tasks        where business_id = v_biz) > 0 then
    raise exception 'deneme firması boş değil; örnek veri zaten var ya da elle kayıt girilmiş. Önce deneme-ornek-veri-sil.sql dosyasını çalıştırın. Hiçbir şey yazılmadı.';
  end if;

  ---------------------------------------------------------------
  -- 1) Geçici çalışma tabloları (işlem bitince otomatik silinir)
  ---------------------------------------------------------------
  create temp table _s_staff (idx int, id uuid not null default gen_random_uuid(), full_name text, title text, phone text, rate numeric) on commit drop;
  create temp table _s_svc   (idx int, id uuid not null default gen_random_uuid(), name text, dur int, price numeric, category text, staff_idx int) on commit drop;
  create temp table _s_cust  (idx int, id uuid not null default gen_random_uuid(), full_name text, source text, tags text, status text,
                              is_lead boolean, created_ago int, last_ago int, note text, stage_pos int, bday_off int) on commit drop;
  create temp table _s_pkg   (idx int, id uuid not null default gen_random_uuid(), cust_idx int, svc_idx int, name text, total int, used int,
                              price numeric, purchased_ago int) on commit drop;
  create temp table _s_appt  (id uuid not null default gen_random_uuid(), cust_idx int, svc_idx int, staff_idx int, starts_at timestamptz,
                              status text, price numeric, pkg_idx int, booked_online boolean not null default false,
                              unpaid boolean not null default false) on commit drop;

  ---------------------------------------------------------------
  -- 2) Personel (4) + vardiyalar
  ---------------------------------------------------------------
  insert into _s_staff (idx, full_name, title, phone, rate) values
    (1, 'Merve Aksoy',  'Cilt Uzmanı',     '0532 000 10 01', 15),
    (2, 'Selin Karaca', 'Lazer Uzmanı',    '0533 000 10 02', 20),
    (3, 'Burak Yurt',   'Fizyoterapist',   '0534 000 10 03', 12),
    (4, 'Elif Tan',     'Pilates Eğitmeni','0535 000 10 04', 10);

  insert into public.staff (id, business_id, full_name, title, phone, commission_rate, is_active, created_at)
  select id, v_biz, full_name, title, phone, rate, true, now() - interval '200 days' from _s_staff;

  -- Pzt–Cmt 09:00–18:00 (Elif Cumartesi çalışmaz)
  insert into public.staff_shifts (business_id, staff_id, weekday, start_time, end_time, is_active)
  select v_biz, s.id, d, '09:00', '18:00', true
  from _s_staff s cross join generate_series(1, 6) as d
  where not (s.idx = 4 and d = 6);

  ---------------------------------------------------------------
  -- 3) Hizmetler (7)
  ---------------------------------------------------------------
  insert into _s_svc (idx, name, dur, price, category, staff_idx) values
    (1, 'Cilt Bakımı',          60, 1200, 'Cilt',     1),
    (2, 'Lazer Epilasyon',      45, 1800, 'Lazer',    2),
    (3, 'Medikal Masaj',        60, 1500, 'Terapi',   3),
    (4, 'Reformer Pilates',     50,  700, 'Pilates',  4),
    (5, 'Hydrafacial',          60, 2200, 'Cilt',     2),
    (6, 'Diyetisyen Görüşmesi', 40,  900, 'Beslenme', 4),
    (7, 'Kalıcı Makyaj',       120, 6500, 'Makyaj',   1);

  insert into public.services (id, business_id, name, duration_min, price, category, bookable, created_at)
  select id, v_biz, name, dur, price, category, true, now() - interval '200 days' from _s_svc;

  ---------------------------------------------------------------
  -- 4) Müşteriler (30) + lead'ler (8)
  --    created_ago: kaç gün önce oluştu; last_ago: en geç randevu yaşı
  --    (aktif/yeni = 1; pasif/arşiv = o günden önce hiç gelmedi)
  ---------------------------------------------------------------
  insert into _s_cust (idx, full_name, source, tags, status, is_lead, created_ago, last_ago, note, stage_pos, bday_off) values
    ( 1, 'Ayşe Demir',      'Instagram',  'vip,düzenli', 'active',   false, 170, 1,   'Hassas cilt, parfümsüz ürün tercih ediyor.', null,   2),
    ( 2, 'Zeynep Kaya',     'Tavsiye',    'düzenli',     'active',   false, 160, 1,   null, null, null),
    ( 3, 'Aylin Yıldız',    'WhatsApp',   'vip',         'active',   false, 150, 1,   'Sabah randevularını tercih ediyor.', null, null),
    ( 4, 'Sibel Arslan',    'Google',     null,          'active',   false, 140, 1,   null, null, null),
    ( 5, 'Deniz Çelik',     'Instagram',  'düzenli',     'active',   false, 130, 1,   null, null, null),
    ( 6, 'Büşra Şahin',     'Tavsiye',    null,          'active',   false, 120, 1,   null, null, null),
    ( 7, 'Gizem Aydın',     'Instagram',  'vip',         'active',   false, 110, 1,   'Ödeme planı konuşulacak.', null, 5),
    ( 8, 'Ceren Öztürk',    'Web Sitesi', null,          'active',   false, 100, 1,   null, null, null),
    ( 9, 'Melis Koç',       'Instagram',  'kampanya',    'active',   false,  95, 1,   null, null, null),
    (10, 'Nazlı Polat',     'Tavsiye',    'düzenli',     'active',   false,  90, 1,   null, null, null),
    (11, 'Pınar Kurt',      'WhatsApp',   null,          'active',   false,  85, 1,   null, null, null),
    (12, 'Burcu Erdem',     'Instagram',  null,          'active',   false,  80, 1,   null, null, null),
    (13, 'Emre Karaca',     'Google',     null,          'active',   false,  75, 1,   null, null, 9),
    (14, 'Tuğba Aksoy',     'Instagram',  'düzenli',     'active',   false,  70, 1,   null, null, null),
    (15, 'Dilara Yavuz',    'Facebook',   'kampanya',    'active',   false,  60, 1,   null, null, null),
    (16, 'Hande Çetin',     'Instagram',  null,          'active',   false,  55, 1,   null, null, null),
    (17, 'Sevgi Bulut',     'Tavsiye',    null,          'active',   false,  50, 1,   null, null, null),
    (18, 'Mert Eren',       'Web Sitesi', null,          'active',   false,  45, 1,   null, null, null),
    (19, 'Ece Taş',         'WhatsApp',   'vip',         'active',   false,  40, 1,   null, null, null),
    (20, 'Naz Işık',        'Instagram',  null,          'active',   false,  35, 1,   null, null, null),
    -- bu ay gelen yeni müşteriler (created_ago, ay başına göre aşağıda kısılır)
    (21, 'Aslı Doğan',      'Instagram',  'yeni',        'new',      false,   3, 1,   null, null, null),
    (22, 'Cansu Akın',      'WhatsApp',   'yeni',        'new',      false,   2, 1,   null, null, null),
    (23, 'Ebru Sönmez',     'Google',     'yeni',        'new',      false,   1, 1,   null, null, null),
    (24, 'Gamze Tunç',      'Tavsiye',    'yeni',        'new',      false,   2, 1,   null, null, null),
    -- pasif (uzun süredir gelmiyor) ve arşiv
    (25, 'Hülya Bayram',    'Instagram',  null,          'passive',  false, 170, 110, null, null, null),
    (26, 'İrem Kılıç',      'Facebook',   null,          'passive',  false, 165, 130, null, null, null),
    (27, 'Jale Önal',       'Tavsiye',    null,          'passive',  false, 150, 100, null, null, null),
    (28, 'Kübra Aslan',     'Google',     null,          'passive',  false, 175, 150, null, null, null),
    (29, 'Leyla Duman',     'Instagram',  null,          'archived', false, 178, 160, 'Başka şehre taşındı.', null, null),
    (30, 'Müge Sezer',      'Diğer',      null,          'archived', false, 175, 140, null, null, null),
    -- lead'ler (Lead'ler panosu)
    (31, 'Ozan Başaran',    'Instagram',  null, 'new',  true, 1,  1, 'Lazer epilasyon fiyatı sordu.',           0, null),
    (32, 'Tülin Yalçın',    'WhatsApp',   null, 'new',  true, 2,  1, 'Hydrafacial için bilgi istedi.',          0, null),
    (33, 'Sinem Uysal',     'Web Sitesi', null, 'lead', true, 6,  1, 'Paket seçeneklerini öğrenmek istiyor.',   1, null),
    (34, 'Fatma Kalkan',    'Facebook',   null, 'lead', true, 9,  1, 'Ulaşılamadı, akşam tekrar aranacak.',     1, null),
    (35, 'Oğuz Çınar',      'Tavsiye',    null, 'lead', true, 12, 1, 'Medikal masaj için randevu düşünüyor.',   1, null),
    (36, 'Damla Ekinci',    'Instagram',  null, 'lead', true, 15, 1, 'Deneme seansı için gün bekliyor.',        2, null),
    (37, 'Hakan Tezcan',    'Google',     null, 'lead', true, 18, 1, 'Pilates grubuna katılmak istiyor.',       2, null),
    (38, 'Rabia Özdemir',   'Tavsiye',    null, 'lead', true, 24, 1, 'Paket satın aldı, müşteriye çevrilecek.', 3, null);

  -- Bu ay gelen yeni müşteriler: ayın dışına taşmasın (ayın 1'inde bugün oluşur)
  update _s_cust set created_ago = least(created_ago, greatest(v_dom - 1, 0)) where idx between 21 and 24;

  -- Lead'lerin aşaması: firmanın mevcut aşamaları; yoksa varsayılan 4'ü oluştur.
  select array_agg(id order by position) into v_stages from public.pipeline_stages where business_id = v_biz;
  if v_stages is null then
    insert into public.pipeline_stages (business_id, name, color, position) values
      (v_biz, 'Yeni Lead',         '#3B82F6', 0),
      (v_biz, 'İletişimde',        '#F59E0B', 1),
      (v_biz, 'Randevu Planlandı', '#5B5BD6', 2),
      (v_biz, 'Kazanıldı',         '#16A34A', 3);
    select array_agg(id order by position) into v_stages from public.pipeline_stages where business_id = v_biz;
  end if;

  insert into public.customers
    (id, business_id, full_name, phone, email, source, tags, note, status, is_lead, pipeline_stage_id, birthday, created_at)
  select
    c.id, v_biz, c.full_name,
    '05' || (array['32','33','34','35','36','37','38','39'])[(c.idx % 8) + 1] || ' 000 00 ' || lpad(c.idx::text, 2, '0'),
    null, c.source,
    case when c.tags is null then null else string_to_array(c.tags, ',') end,
    c.note, c.status, c.is_lead,
    case when c.is_lead then v_stages[1 + (c.stage_pos % array_length(v_stages, 1))] else null end,
    -- doğum günü: bir kısmı önümüzdeki günlerde (panel "yaklaşan doğum günleri")
    make_date(
      1980 + (c.idx * 3) % 20,
      extract(month from (v_today + coalesce(c.bday_off, 11 + (c.idx * 13) % 300)))::int,
      least(extract(day from (v_today + coalesce(c.bday_off, 11 + (c.idx * 13) % 300)))::int,
            case when extract(month from (v_today + coalesce(c.bday_off, 11 + (c.idx * 13) % 300))) = 2 then 28 else 31 end)
    ),
    least(now(), ((v_today - c.created_ago) + time '11:00') at time zone 'Europe/Istanbul')
  from _s_cust c;   -- müşteriler ve lead'ler aynı tabloda (is_lead ile ayrılır)

  ---------------------------------------------------------------
  -- 5) Paketler (13)
  ---------------------------------------------------------------
  insert into _s_pkg (idx, cust_idx, svc_idx, name, total, used, price, purchased_ago) values
    ( 1,  1, 2, 'Lazer Epilasyon 6 Seans',     6, 5,  9000, 120),
    ( 2,  3, 1, 'Cilt Bakımı 8 Seans',         8, 8,  8000, 150),
    ( 3,  5, 4, 'Reformer Pilates 12 Seans',  12, 4,  7200,  60),
    ( 4,  7, 2, 'Lazer Epilasyon 8 Seans',     8, 2, 12000,  45),
    ( 5,  2, 3, 'Medikal Masaj 10 Seans',     10, 9, 12000, 130),
    ( 6,  9, 5, 'Hydrafacial 4 Seans',         4, 1,  8000,  20),
    ( 7, 10, 4, 'Reformer Pilates 8 Seans',    8, 8,  5000,  85),
    ( 8,  4, 6, 'Diyetisyen 4 Seans',          4, 2,  3200,  40),
    ( 9, 14, 1, 'Cilt Bakımı 6 Seans',         6, 3,  6000,  70),
    (10, 16, 2, 'Lazer Epilasyon 6 Seans',     6, 0,  9000,   3),
    (11, 20, 3, 'Medikal Masaj 6 Seans',       6, 2,  7200,  25),
    (12,  6, 4, 'Reformer Pilates 12 Seans',  12, 11, 7200, 115),
    (13, 13, 3, 'Medikal Masaj 6 Seans',       6, 3,  7200,  65);

  insert into public.packages
    (id, business_id, customer_id, service_name, total_sessions, remaining_sessions, purchased_at, price, created_at)
  select
    p.id, v_biz, c.id, p.name, p.total, p.total,   -- kalan, en sonda gerçek kullanımdan hesaplanır
    ((v_today - p.purchased_ago) + time '12:00') at time zone 'Europe/Istanbul',
    p.price,
    ((v_today - p.purchased_ago) + time '12:00') at time zone 'Europe/Istanbul'
  from _s_pkg p join _s_cust c on c.idx = p.cust_idx;

  ---------------------------------------------------------------
  -- 6) Randevular — hepsi önce _s_appt'ta toplanır
  ---------------------------------------------------------------

  -- 6a) Geçmiş 6 ay: bağımsız randevular (Pazar hariç; saatler 09–14, uzman başına çakışmaz)
  with slots as (
    select g.ago, st.s, h.h,
           abs(hashtext('s' || g.ago || '.' || st.s || '.' || h.h)::bigint) as hv
    from generate_series(1, 180) as g(ago)
    cross join generate_series(1, 4) as st(s)
    cross join generate_series(9, 14) as h(h)
    where extract(isodow from (v_today - g.ago)) <> 7
  ), picked as (
    select sl.*,
           case sl.s
             when 1 then 1
             when 3 then 3
             when 2 then case when sl.hv % 3 = 0 then 5 else 2 end
             else        case when sl.hv % 3 = 0 then 6 else 4 end
           end as sv
    from slots sl
    where sl.hv % 100 < case when sl.ago <= 60 then 24 else 17 end
  )
  insert into _s_appt (cust_idx, svc_idx, staff_idx, starts_at, status, price, booked_online)
  select c.idx, p.sv, p.s,
         ((v_today - p.ago) + make_time(p.h, 0, 0)) at time zone 'Europe/Istanbul',
         x.st,
         case when x.st = 'completed' then sv.price end,
         abs(hashtext('o' || p.ago || '.' || p.s || '.' || p.h)::bigint) % 100 < 18
  from picked p
  cross join lateral (
    select c2.idx from _s_cust c2
    where not c2.is_lead and c2.created_ago >= p.ago and c2.last_ago <= p.ago
    order by hashtext('c' || p.ago || '.' || p.s || '.' || p.h || '.' || c2.idx)
    limit 1
  ) c
  cross join lateral (
    select case
      when abs(hashtext('t' || p.ago || '.' || p.s || '.' || p.h)::bigint) % 100 < 3 then 'no_show'
      when abs(hashtext('t' || p.ago || '.' || p.s || '.' || p.h)::bigint) % 100 < 8 then 'cancelled'
      else 'completed' end as st
  ) x
  join _s_svc sv on sv.idx = p.sv;

  -- 6b) Geçmiş: paket seansları (tamamlanmış; fiyat yok, ücret pakette). Saat 15–17.
  insert into _s_appt (cust_idx, svc_idx, staff_idx, starts_at, status, price, pkg_idx)
  select p.cust_idx, p.svc_idx, sv.staff_idx,
         ((v_today - x.ago) + make_time(15 + p.idx % 3, 0, 0)) at time zone 'Europe/Istanbul',
         'completed', null, p.idx
  from _s_pkg p
  join _s_svc sv on sv.idx = p.svc_idx
  cross join lateral generate_series(1, p.used) as k(k)
  cross join lateral (
    select raw.a + case when extract(isodow from (v_today - raw.a)) = 7 then 1 else 0 end as ago
    from (select p.purchased_ago
                 - k.k * greatest(1, least(14, floor((p.purchased_ago - 1)::numeric / greatest(p.used, 1))::int)) as a) raw
  ) x;

  -- 6c) BUGÜN (Europe/Istanbul): 15 randevu, 4 uzmana dağıtılmış
  insert into _s_appt (cust_idx, svc_idx, staff_idx, starts_at, status, price, pkg_idx)
  select t.cust, t.svc, t.staff,
         (v_today + make_time(t.h, t.m, 0)) at time zone 'Europe/Istanbul',
         t.status,
         case when t.pkg is null and t.status in ('completed', 'planned', 'arrived') then sv.price end,
         t.pkg
  from (values
    -- uzman, saat, dk, müşteri, hizmet, durum, paket
    (1,  9,  0,  2, 1, 'completed', null::int),
    (1, 10, 30,  8, 1, 'completed', null::int),
    (1, 13,  0, 11, 7, 'planned',   null::int),
    (1, 16,  0, 17, 1, 'planned',   null::int),
    (2,  9, 30, 13, 2, 'completed', null::int),
    (2, 11,  0,  7, 2, 'planned',   4),
    (2, 12, 30, 14, 5, 'no_show',   null::int),
    (2, 15,  0, 21, 2, 'planned',   null::int),
    (3, 10,  0,  3, 3, 'completed', null::int),
    (3, 11, 30,  6, 3, 'cancelled', null::int),
    (3, 14,  0,  2, 3, 'arrived',   5),
    (3, 16,  0, 20, 3, 'planned',   11),
    (4,  9,  0, 10, 4, 'completed', null::int),
    (4, 12,  0, 15, 6, 'planned',   null::int),
    (4, 17,  0,  9, 4, 'planned',   null::int)
  ) as t(staff, h, m, cust, svc, status, pkg)
  join _s_svc sv on sv.idx = t.svc;

  -- 6d) Önümüzdeki 21 gün: bağımsız planlı randevular (Pazar hariç; birkaçı iptal)
  with slots as (
    select g.ago, st.s, h.h,
           abs(hashtext('f' || g.ago || '.' || st.s || '.' || h.h)::bigint) as hv
    from generate_series(1, 21) as g(ago)
    cross join generate_series(1, 4) as st(s)
    cross join generate_series(9, 14) as h(h)
    where extract(isodow from (v_today + g.ago)) <> 7
  ), picked as (
    select sl.*,
           case sl.s
             when 1 then 1
             when 3 then 3
             when 2 then case when sl.hv % 3 = 0 then 5 else 2 end
             else        case when sl.hv % 3 = 0 then 6 else 4 end
           end as sv
    from slots sl
    where sl.hv % 100 < case when sl.ago <= 7 then 25 else 14 end
  )
  insert into _s_appt (cust_idx, svc_idx, staff_idx, starts_at, status, price, booked_online)
  select c.idx, p.sv, p.s,
         ((v_today + p.ago) + make_time(p.h, 0, 0)) at time zone 'Europe/Istanbul',
         case when abs(hashtext('x' || p.ago || '.' || p.s || '.' || p.h)::bigint) % 100 < 4 then 'cancelled' else 'planned' end,
         case when abs(hashtext('x' || p.ago || '.' || p.s || '.' || p.h)::bigint) % 100 < 4 then null else sv.price end,
         abs(hashtext('o' || p.ago || '.' || p.s || '.' || p.h)::bigint) % 100 < 25
  from picked p
  cross join lateral (
    select c2.idx from _s_cust c2
    where not c2.is_lead and c2.status in ('active', 'new')
    order by hashtext('fc' || p.ago || '.' || p.s || '.' || p.h || '.' || c2.idx)
    limit 1
  ) c
  join _s_svc sv on sv.idx = p.sv;

  -- 6e) Önümüzdeki günler: paketlerin sıradaki seansları (planlı, paket bağlı)
  insert into _s_appt (cust_idx, svc_idx, staff_idx, starts_at, status, price, pkg_idx)
  select p.cust_idx, p.svc_idx, sv.staff_idx,
         ((v_today + x.dayoff) + make_time(15 + p.idx % 3, 0, 0)) at time zone 'Europe/Istanbul',
         'planned', null, p.idx
  from (values (1, 6), (3, 4), (3, 18), (4, 9), (4, 16), (6, 10), (8, 7), (9, 5), (9, 19),
               (10, 3), (10, 14), (11, 6), (12, 8), (13, 11)) as f(pkg, off0)
  join _s_pkg p on p.idx = f.pkg
  join _s_svc sv on sv.idx = p.svc_idx
  cross join lateral (
    select f.off0 + case when extract(isodow from (v_today + f.off0)) = 7 then 1 else 0 end as dayoff
  ) x;

  -- Ödenmemiş bırakılacak tamamlanmış randevular (açık borç):
  -- bugünkü Merve 10:30 + son 25 günün yaklaşık %8'i
  update _s_appt a set unpaid = true
  where a.status = 'completed' and a.pkg_idx is null and a.price is not null
    and (
      (a.cust_idx = 8 and a.staff_idx = 1 and (a.starts_at at time zone 'Europe/Istanbul')::date = v_today)
      or (a.starts_at >= now() - interval '25 days'
          and abs(hashtext('u' || a.id::text)::bigint) % 100 < 8)
    );

  -- Gerçek tabloya yaz
  insert into public.appointments
    (id, business_id, customer_id, service_id, starts_at, staff_member_id, status, note,
     package_id, price, booked_online, arrived_at, created_at)
  select
    a.id, v_biz, c.id, sv.id, a.starts_at, st.id, a.status,
    case when a.booked_online then 'Online randevu linkinden alındı' else null end,
    p.id, a.price, a.booked_online,
    case when a.status = 'arrived' then least(now(), a.starts_at) else null end,
    least(now(), a.starts_at - interval '2 days')
  from _s_appt a
  join _s_cust  c  on c.idx  = a.cust_idx
  join _s_svc   sv on sv.idx = a.svc_idx
  join _s_staff st on st.idx = a.staff_idx
  left join _s_pkg p on p.idx = a.pkg_idx;

  ---------------------------------------------------------------
  -- 7) Ödemeler
  ---------------------------------------------------------------

  -- 7a) Paket ödemeleri (taksitler). Tetikleyici paid_amount/payment_status'u günceller.
  insert into public.payments (business_id, customer_id, amount, method, related_type, related_id, note, created_at)
  select v_biz, c.id, t.amount, t.method, 'paket', p.id, t.note,
         least(now(), ((v_today - t.ago) + time '12:00') at time zone 'Europe/Istanbul')
  from (values
    -- paket, kaç gün önce, tutar, yöntem, not
    ( 1, 120, 4500, 'kart',   'Peşinat'),
    ( 1,  90, 4500, 'kart',   'Kalan'),
    ( 2, 150, 8000, 'nakit',  'Peşin'),
    ( 3,  60, 2400, 'kart',   '1. taksit'),
    ( 3,  30, 2400, 'kart',   '2. taksit'),
    ( 4,  45, 3000, 'kart',   'Peşinat'),
    ( 5, 130, 6000, 'kart',   'Peşinat'),
    ( 5, 100, 6000, 'havale', 'Kalan'),
    ( 6,  20, 4000, 'kart',   'Peşinat'),
    ( 7,  85, 5000, 'nakit',  'Peşin'),
    ( 8,  40, 1600, 'nakit',  'Peşinat'),
    ( 8,  15,  800, 'nakit',  '2. taksit'),
    ( 9,  70, 2000, 'kart',   '1. taksit'),
    ( 9,  40, 2000, 'kart',   '2. taksit'),
    ( 9,  10, 2000, 'kart',   '3. taksit'),
    (11,  25, 3600, 'kart',   'Peşinat'),
    (12, 115, 2400, 'kart',   '1. taksit'),
    (12,  85, 2400, 'kart',   '2. taksit'),
    (12,  55, 2400, 'kart',   '3. taksit'),
    (13,  65, 2000, 'havale', 'Peşinat')
  ) as t(pkg, ago, amount, method, note)
  join _s_pkg p on p.idx = t.pkg
  join _s_cust c on c.idx = p.cust_idx
  order by t.ago desc;   -- eskiden yeniye (taksit sırası)

  -- 7b) Bağımsız tamamlanmış randevuların tahsilatı (ödenmemişler hariç)
  insert into public.payments (business_id, customer_id, amount, method, related_type, related_id, note, created_at)
  select v_biz, c.id, a.price,
         case when hh.h < 55 then 'kart' when hh.h < 85 then 'nakit' else 'havale' end,
         'randevu', a.id, null,
         least(a.starts_at + interval '70 minutes', now())
  from _s_appt a
  join _s_cust c on c.idx = a.cust_idx
  cross join lateral (select abs(hashtext('m' || a.id::text)::bigint) % 100 as h) hh
  where a.status = 'completed' and a.pkg_idx is null and a.price is not null and not a.unpaid;

  ---------------------------------------------------------------
  -- 8) Seans düşümü ve son ziyaret (tetikleyici INSERT'te çalışmadığı için burada, bir kez)
  ---------------------------------------------------------------
  update public.packages p
  set remaining_sessions = greatest(
        p.total_sessions - (select count(*) from public.appointments a
                            where a.package_id = p.id and a.business_id = v_biz and a.status = 'completed'), 0)
  where p.business_id = v_biz;

  update public.customers c
  set last_visit_at = m.mx
  from (select customer_id, max(starts_at) as mx
        from public.appointments
        where business_id = v_biz and status = 'completed'
        group by customer_id) m
  where c.id = m.customer_id and c.business_id = v_biz;

  ---------------------------------------------------------------
  -- 9) Giderler (son 4 ay: bu ay + önceki 3)
  ---------------------------------------------------------------
  insert into public.expenses (business_id, title, category, amount, spent_at, method, created_at)
  select v_biz, t.title, t.category,
         round(t.amount * (1 + (abs(hashtext(t.title || m.m)::bigint) % 9) / 100.0), -1),
         d.spent, t.method, d.spent::timestamp at time zone 'Europe/Istanbul'
  from (values
    ('Salon kirası',                 'kira',      35000, 1,  'havale'),
    ('Personel maaşları',            'maas',      92000, 28, 'havale'),
    ('Elektrik faturası',            'fatura',     4200, 12, 'havale'),
    ('İnternet ve telefon',          'fatura',     1150, 15, 'kart'),
    ('Cilt bakım ürünleri',          'malzeme',   14500, 8,  'kart'),
    ('Sarf malzeme (eldiven, maske)','malzeme',    3800, 18, 'nakit'),
    ('Sosyal medya reklamı',         'pazarlama',  6000, 5,  'kart'),
    ('KDV ödemesi',                  'vergi',     11800, 26, 'havale'),
    ('Temizlik hizmeti',             'diger',      2600, 20, 'nakit')
  ) as t(title, category, amount, dd, method)
  cross join generate_series(0, 3) as m(m)
  cross join lateral (
    select ((date_trunc('month', v_today::timestamp) - make_interval(months => m.m))::date + (t.dd - 1)) as spent
  ) d
  where d.spent <= v_today;

  ---------------------------------------------------------------
  -- 10) Stok (6 ürün, biri kritik seviyede)
  ---------------------------------------------------------------
  create temp table _s_prod (idx int, id uuid not null default gen_random_uuid(), name text, sku text, category text, unit text,
                             crit numeric, cost numeric, sale numeric) on commit drop;
  insert into _s_prod (idx, name, sku, category, unit, crit, cost, sale) values
    (1, 'Hyaluronik Asit Serum 30 ml', 'DNM-001', 'Cilt bakım',  'adet', 5,  420, 780),
    (2, 'Tek Kullanımlık Maske',       'DNM-002', 'Sarf',        'adet', 100, 6, null),
    (3, 'Lazer Jel 250 ml',            'DNM-003', 'Lazer',       'adet', 4,  180, null),
    (4, 'Masaj Yağı 500 ml',           'DNM-004', 'Terapi',      'adet', 3,  210, 390),
    (5, 'Eldiven (kutu)',              'DNM-005', 'Sarf',        'kutu', 6,  95,  null),
    (6, 'Nemlendirici Krem 50 ml',     'DNM-006', 'Cilt bakım',  'adet', 4,  310, 650);

  insert into public.products (id, business_id, name, sku, category, unit, stock_qty, critical_level, cost_price, sale_price, is_active, created_at)
  select id, v_biz, name, sku, category, unit, 0, crit, cost, sale, true, now() - interval '70 days' from _s_prod;

  -- önce girişler, sonra çıkış/tüketim (tetikleyici stoğu hesaplar; hedef: 14, 220, 3 [kritik], 9, 18, 11)
  insert into public.stock_movements (business_id, product_id, kind, qty, note, created_at)
  select v_biz, p.id, 'in', t.qty, 'İlk stok girişi', now() - (t.ago || ' days')::interval
  from (values (1, 20, 65), (2, 300, 65), (3, 12, 65), (4, 12, 65), (5, 24, 65), (6, 15, 65)) as t(prod, qty, ago)
  join _s_prod p on p.idx = t.prod;

  insert into public.stock_movements (business_id, product_id, kind, qty, note, created_at)
  select v_biz, p.id, t.kind, t.qty, t.note, now() - (t.ago || ' days')::interval
  from (values
    (1, 'consume',  2, 'Seansta kullanıldı', 50), (1, 'consume', 2, 'Seansta kullanıldı', 30), (1, 'consume', 2, 'Seansta kullanıldı', 10),
    (2, 'out',     40, 'Sarf çıkışı',        45), (2, 'out',    40, 'Sarf çıkışı',        15),
    (3, 'consume',  3, 'Seansta kullanıldı', 40), (3, 'consume', 3, 'Seansta kullanıldı', 22), (3, 'consume', 3, 'Seansta kullanıldı', 6),
    (4, 'consume',  1, 'Seansta kullanıldı', 35), (4, 'consume', 1, 'Seansta kullanıldı', 20), (4, 'consume', 1, 'Seansta kullanıldı', 5),
    (5, 'out',      3, 'Sarf çıkışı',        38), (5, 'out',     3, 'Sarf çıkışı',        12),
    (6, 'out',      2, 'Satış',              28), (6, 'out',     2, 'Satış',              9)
  ) as t(prod, kind, qty, note, ago)
  join _s_prod p on p.idx = t.prod;

  ---------------------------------------------------------------
  -- 11) Görevler (açık + bitmiş). Liste yoksa varsayılan 3 liste açılır.
  ---------------------------------------------------------------
  if not exists (select 1 from public.task_columns where business_id = v_biz) then
    insert into public.task_columns (business_id, label, color, is_done, position) values
      (v_biz, 'Yapılacaklar',  'bg-amber-400',   false, 0),
      (v_biz, 'Devam Edenler', 'bg-primary',     false, 1),
      (v_biz, 'Tamamlananlar', 'bg-emerald-500', true,  2);
  end if;

  select id into v_done from public.task_columns where business_id = v_biz and is_done order by position limit 1;
  select id into v_col0 from public.task_columns where business_id = v_biz and not is_done order by position limit 1;
  select id into v_col1 from public.task_columns where business_id = v_biz and not is_done and id <> v_col0 order by position limit 1;
  v_col1 := coalesce(v_col1, v_col0);
  -- Tamamlanan liste hiç yoksa (kullanıcı silmişse) bitmiş görevleri ilk listeye koy
  v_done := coalesce(v_done, v_col0);

  insert into public.tasks
    (business_id, column_id, position, title, description, assignee_id, assignee_is_team,
     due_at, priority, customer_id, has_alert, completed_at, created_at)
  select v_biz, g.col, row_number() over (partition by g.col order by g.n) - 1,
         g.title, g.descr, st.id, g.staff is null, g.due, g.prio, c.id, g.alert, g.completed,
         least(now(), coalesce(g.completed, g.due) - interval '4 days')
  from (
    select t.n, t.title, t.descr, t.staff, t.cust, t.prio, t.alert,
           case when t.done then v_done when t.col1 then v_col1 else v_col0 end as col,
           ((v_today + t.due_off) + time '17:00') at time zone 'Europe/Istanbul' as due,
           case when t.done then least(now(), ((v_today + t.due_off) + time '17:00') at time zone 'Europe/Istanbul') end as completed
    from (values
      -- n, başlık, açıklama, uzman, müşteri, öncelik, uyarı, "devam eden" listesi mi, gün farkı, bitti mi
      (1, 'Hande Çetin ile paket ödemesini görüş', 'Paket ücreti henüz alınmadı; ödeme planı öner.', 1,         16,   'high',   true,  false,  0, false),
      (2, 'Lazer cihazı bakımını planla',          'Yıllık bakım için servisi ara.',                 2,         null, 'normal', false, true,   3, false),
      (3, 'Pasif müşterileri ara',                 'Hülya ve İrem''e indirim teklifi ilet.',         null::int, 25,   'normal', false, true,   2, false),
      (4, 'Haftalık stok sayımı',                  'Lazer jel kritik seviyede; sipariş ver.',        4,         null, 'low',    false, false,  5, false),
      (5, 'Gizem Aydın paket borcu görüşmesi',     'Vadesi geçmiş borç için arama yap.',             1,         7,    'high',   true,  false, -2, false),
      (6, 'Yeni lead''lere dönüş yap',             'Son 3 günde gelen lead''leri ara.',              null::int, null, 'normal', false, false,  1, false),
      (7, 'Ay sonu kasa kapanışı',                 null,                                             null::int, null, 'normal', false, false, -3, true),
      (8, 'Kalıcı makyaj pigment siparişi',        'Tedarikçiye sipariş verildi.',                   1,         null, 'low',    false, false, -6, true),
      (9, 'Sosyal medya kampanya görseli',         null,                                             4,         null, 'low',    false, false, -9, true)
    ) as t(n, title, descr, staff, cust, prio, alert, col1, due_off, done)
  ) g
  left join _s_staff st on st.idx = g.staff
  left join _s_cust  c  on c.idx  = g.cust;

  ---------------------------------------------------------------
  -- 12) Özet
  ---------------------------------------------------------------
  select count(*) filter (where not is_lead), count(*) filter (where is_lead)
    into v_cnt_c, v_cnt_l from public.customers where business_id = v_biz;
  select count(*) into v_cnt_a   from public.appointments where business_id = v_biz;
  select count(*) into v_cnt_pk  from public.packages     where business_id = v_biz;
  select count(*) into v_cnt_pay from public.payments     where business_id = v_biz;
  select count(*) into v_cnt_e   from public.expenses     where business_id = v_biz;
  select count(*) into v_cnt_pr  from public.products     where business_id = v_biz;
  select count(*) into v_cnt_t   from public.tasks        where business_id = v_biz;
  raise notice 'deneme örnek veri yazıldı: % müşteri, % lead, % randevu, % paket, % ödeme, % gider, % ürün, % görev',
    v_cnt_c, v_cnt_l, v_cnt_a, v_cnt_pk, v_cnt_pay, v_cnt_e, v_cnt_pr, v_cnt_t;
end;
$$;
