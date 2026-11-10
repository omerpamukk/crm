-- =============================================================
-- 0030_randevu_saat_duzeltme.sql
-- Randevu saati dilimi düzeltmesinin 2. adımı: YENİ KOD CANLIYA ÇIKTIKTAN
-- SONRA, hemen ardından çalıştırılır. 0029 önce çalışmış olmalıdır.
-- Tek işlemdir (bir DO bloğu + fonksiyonlar): hata olursa hiçbir şey değişmez.
--
-- NE YAPAR (üçü de aynı anda, bu yüzden veri ve fonksiyonlar birbirine uyumlu):
--  1) DÜZELTME — panelden (formdan) girilmiş eski randevular UTC-naif
--     saklanıyordu (14:00 girilen kayıt 14:00Z = 17:00 TR). Bu kayıtların
--     saklanan duvar saati İstanbul saati kabul edilip gerçek ana çevrilir
--     (14:00Z -> 11:00Z; fiilen 3 saat geri). Tarih de buna göre kayar, gece
--     yarısına yakın kayıtlar günü doğru değiştirir.
--     ÖLÇÜT (hepsi birden): tz_normalized = false  VE  booked_online = false
--     VE firma, aşağıdaki hariç listesinde değil.
--       - booked_online = true kayıtlar zaten doğru (create_booking ofsetli ISO
--         alır) — dokunulmaz, yalnızca doğru işaretlenir.
--       - tz_normalized = true olanlar (yeni kodla girilen/saati değiştirilen)
--         dokunulmaz. Böylece düzeltme iki kez çalıştırılsa bile aynı satıra
--         ikinci kez uygulanmaz.
--       - Hariç firmalar (varsayılan 'deneme'): örnek veri betiği
--         (seed/deneme-ornek-veri.sql) saatleri zaten doğru dilimle yazdığı için
--         kaydırılmaz. O firmaya elle girilmiş kayıtlar da kaydırılmaz;
--         gerekirse örnek veriyi silip yeniden yükleyin.
--     İşlenen her satırın eski değeri appointments_saat_yedek_0030 tablosuna
--     yazılır (geri dönüş için; dosya sonundaki geri alma betiğine bakın).
--  2) booked_slots (0024/0028): dolu saatleri ve gün sınırlarını İstanbul
--     saatine göre hesaplar (eskisi UTC'ye göre 3 saat kayıktı: online sayfa
--     yanlış saatleri dolu gösteriyordu).
--  3) sidebar_badges (0022/0028): "bugün" sınırları İstanbul gününe göre
--     (eskisi UTC günüydü: gece 00:00–03:00 TR arasında yanlış sayıyordu).
--
-- DOKUNMAZ: arrived_at, created_at, ödeme/paket tarihleri (now() ile yazılır,
-- zaten doğru), customers.last_visit_at (gün bazında kullanılır, 3 saat
-- fark sonucu değiştirmez), check_appointment_conflict (yalnızca anları
-- karşılaştırır, dilimden bağımsız), görev bitişleri (rapora bakın).
--
-- KORUMA: veritabanı/rol varsayılan saat dilimi UTC değilse ya da 0029
-- çalışmamışsa hiçbir şey yapmadan hata verir. Önce
-- supabase/tani/randevu-saat-tani.sql'i çalıştırıp sonucu inceleyin.
--
-- Dayandığı: 0001, 0020, 0022, 0024, 0028, 0029.
-- Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- Geri dönüş yedeği (yalnızca bu migration tarafından yazılır; RLS açık,
-- politika yok = uygulama kullanıcıları göremez/değiştiremez).
create table if not exists public.appointments_saat_yedek_0030 (
  appointment_id  uuid primary key,
  business_id     uuid not null,
  eski_starts_at  timestamptz not null,
  yeni_starts_at  timestamptz not null,
  yedeklendi_at   timestamptz not null default now()
);
alter table public.appointments_saat_yedek_0030 enable row level security;

do $$
declare
  -- ===== PARAMETRELER =====
  -- Düzeltmeden hariç tutulacak firma adları (tam eşleşme).
  v_haric_firmalar text[] := array['deneme'];
  -- ========================
  v_bad_tz    text;
  v_duzeltilen int;
  v_isaretlenen int;
begin
  -- Koruma 1: 0029 çalışmış mı?
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'appointments'
      and column_name = 'tz_normalized'
  ) then
    raise exception 'Önce 0029_randevu_saat_hazirlik.sql çalıştırılmalı. Hiçbir şey değişmedi.';
  end if;

  -- Koruma 2: veritabanı/rol varsayılan saat dilimi UTC mi? (Değilse "UTC-naif"
  -- varsayımı geçersizdir; tanı dosyasının 1. bölümüne bakın.)
  select string_agg(coalesce(r.rolname, '(tüm roller)') || ': ' || cfg, '; ')
    into v_bad_tz
  from pg_db_role_setting s
  left join pg_roles r on r.oid = s.setrole
  cross join lateral unnest(s.setconfig) as cfg
  where lower(cfg) like 'timezone=%'
    and lower(split_part(cfg, '=', 2)) not in ('utc', 'etc/utc', 'gmt', 'etc/gmt');
  if v_bad_tz is not null then
    raise exception 'Veritabanı saat dilimi UTC değil (%). Randevu saatleri farklı yorumlanmış olabilir; düzeltme çalıştırılmadı. Hiçbir şey değişmedi.', v_bad_tz;
  end if;
  if lower(current_setting('TimeZone')) not in ('utc', 'etc/utc', 'gmt', 'etc/gmt') then
    raise exception 'Bu oturumun saat dilimi UTC değil (%). Düzeltme çalıştırılmadı. Hiçbir şey değişmedi.', current_setting('TimeZone');
  end if;

  -- 1) Düzeltme: önce yedek, sonra güncelleme (aynı ölçüt).
  with hedef as (
    select a.id, a.business_id, a.starts_at,
           ((a.starts_at at time zone 'UTC') at time zone 'Europe/Istanbul') as yeni
    from public.appointments a
    where a.tz_normalized = false
      and coalesce(a.booked_online, false) = false
      and a.business_id not in (
        select b.id from public.businesses b where b.name = any (v_haric_firmalar)
      )
  ), yedek as (
    insert into public.appointments_saat_yedek_0030
      (appointment_id, business_id, eski_starts_at, yeni_starts_at)
    select id, business_id, starts_at, yeni from hedef
    on conflict (appointment_id) do nothing
    returning appointment_id
  ), guncelle as (
    update public.appointments a
       set starts_at = h.yeni,
           tz_normalized = true
      from hedef h
     where a.id = h.id
    returning a.id
  )
  select count(*) into v_duzeltilen from guncelle;

  -- Kalanlar (online kayıtlar + hariç firmalar) doğru kabul edilip işaretlenir;
  -- bundan sonra tz_normalized = false satır kalmaz.
  update public.appointments set tz_normalized = true where tz_normalized = false;
  get diagnostics v_isaretlenen = row_count;

  raise notice 'Saati düzeltilen randevu: %, değiştirilmeden doğru işaretlenen: %', v_duzeltilen, v_isaretlenen;
end $$;

-- =============================================================
-- 2) booked_slots — gün sınırları ve saat etiketi İstanbul saatine göre
--    (0028 sürümünün aynısı; yalnızca saat dilimi açık yazıldı)
-- =============================================================
create or replace function public.booked_slots(p_token text, p_day date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.booking_settings%rowtype;
  result jsonb;
begin
  select * into s from public.booking_settings
  where token = p_token and is_active = true limit 1;
  if not found then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(t), '[]'::jsonb) into result
  from (
    select to_char(a.starts_at at time zone 'Europe/Istanbul', 'HH24:MI') as slot,
           count(*) as taken
    from public.appointments a
    where a.business_id = s.business_id
      and a.status in ('planned', 'arrived')
      and a.starts_at >= (p_day::timestamp at time zone 'Europe/Istanbul')
      and a.starts_at <  ((p_day + 1)::timestamp at time zone 'Europe/Istanbul')
    group by 1
    having count(*) >= s.slot_capacity
  ) t;

  return result;
end;
$$;

grant execute on function public.booked_slots(text, date) to anon, authenticated;

-- =============================================================
-- 3) sidebar_badges — "bugün" İstanbul gününe göre
--    (0028 sürümünün aynısı; yalnızca today_appt sınırları değişti)
-- =============================================================
create or replace function public.sidebar_badges()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with biz as (select public.current_business_id() as id),
  gun as (
    select
      (date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul') as bas,
      ((date_trunc('day', now() at time zone 'Europe/Istanbul') + interval '1 day') at time zone 'Europe/Istanbul') as bit
  ),
  overdue as (
    select count(distinct p.customer_id) as n
    from public.packages p, biz
    where p.business_id = biz.id
      and p.customer_id is not null
      and coalesce(p.price, 0) - coalesce(p.paid_amount, 0) > 0
      and p.purchased_at < now() - interval '30 days'
  ),
  today_appt as (
    select count(*) as n
    from public.appointments a, biz, gun
    where a.business_id = biz.id
      and a.status in ('planned', 'arrived')
      and a.starts_at >= gun.bas
      and a.starts_at <  gun.bit
  ),
  upcoming as (
    select count(*) as n
    from public.appointments a, biz
    where a.business_id = biz.id
      and a.status in ('planned', 'arrived')
      and a.starts_at >= now()
  ),
  cust as (
    select
      count(*) filter (where not coalesce(is_lead, false)) as customers,
      count(*) filter (where coalesce(is_lead, false))     as leads
    from public.customers c, biz
    where c.business_id = biz.id
  )
  select json_build_object(
    'overdueCari',   (select n from overdue),
    'todayAppts',    (select n from today_appt),
    'upcomingAppts', (select n from upcoming),
    'customers',     (select customers from cust),
    'leads',         (select leads from cust)
  );
$$;

grant execute on function public.sidebar_badges() to authenticated;

-- =============================================================
-- GERİ ALMA (gerekirse, elle çalıştırın; bu migration'ın parçası DEĞİLDİR):
--
--   -- Yalnızca düzeltildikten sonra hiç düzenlenmemiş satırları eski haline getirir.
--   update public.appointments a
--      set starts_at = y.eski_starts_at, tz_normalized = false
--     from public.appointments_saat_yedek_0030 y
--    where y.appointment_id = a.id
--      and a.starts_at = y.yeni_starts_at;
--
--   Fonksiyonları eski haline getirmek için 0028'deki booked_slots ve
--   sidebar_badges tanımlarını yeniden çalıştırın.
-- =============================================================
