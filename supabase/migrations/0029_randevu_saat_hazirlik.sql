-- =============================================================
-- 0029_randevu_saat_hazirlik.sql
-- Randevu saati dilimi düzeltmesinin 1. adımı: KOD CANLIYA ÇIKMADAN ÖNCE
-- çalıştırılır. Yalnızca ekleme yapar; çalışan eski kodu bozmaz.
--
-- SORUN: Panel formu "2026-11-05T14:00" gibi ofsetsiz yerel saat gönderiyordu;
-- Postgres bunu UTC saydığı için randevu 3 saat geç (14:00Z = 17:00 TR)
-- saklanıyordu. Yeni kod saati işletme diliminde (Europe/Istanbul) ofsetli
-- yazar. Eski kayıtların düzeltmesi 0030'dadır (kod yayında olduktan sonra).
--
-- NE EKLER:
--  1) appointments.tz_normalized — "starts_at doğru yazıldı" işareti.
--     Eski satırlar false başlar (yeni kod her yazışta true yapar). 0030 yalnızca
--     false olanları düzeltir; böylece düzeltme iki kez uygulanmaz ve
--     yayından sonra girilen/düzenlenen kayıtlara dokunmaz.
--  2) is_staff_available_tz(personel, an, dilim) — vardiya kontrolü
--     vardiya saatlerini (ör. 09:00–18:00) VERİLEN diliminde okur.
--     Eski is_staff_available (0020) aynen kalır: oturum diliminde (UTC)
--     okur, yani 3 saat kaydırır. Eski kod hâlâ onu çağırdığı için
--     değiştirilmedi; yeni kod yeni fonksiyonu çağırır. Eski fonksiyon
--     kod yayına çıktıktan sonra ayrı bir migration ile silinebilir.
--     Mantık 0020 ile aynıdır (yalnızca saat dilimi açık). Not: 0020'de olduğu
--     gibi personelin firmaya aitliği kontrol edilmez (ajans "yönet" modundaki
--     süper-adminin current_business_id()'si boş olduğu için kontrol ekleyip
--     onu bozmamak adına eklenmedi); yalnızca true/false döner, veri sızdırmaz.
--
-- Dayandığı: 0001 (appointments), 0004 (staff), 0020 (staff_shifts,
-- staff_time_off, is_staff_available), 0028.
-- Tekrar-güvenli. Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

alter table public.appointments
  add column if not exists tz_normalized boolean not null default false;

comment on column public.appointments.tz_normalized is
  'starts_at gerçek an olarak (ofsetli) yazıldı mı. false = eski UTC-naif panel kaydı olabilir (0030 düzeltir).';

create or replace function public.is_staff_available_tz(
  p_staff_id  uuid,
  p_starts_at timestamptz,
  p_tz        text default 'Europe/Istanbul'
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz         text := coalesce(nullif(trim(p_tz), ''), 'Europe/Istanbul');
  v_local      timestamp;
  v_weekday    int;
  v_time       text;
  v_has_shifts boolean;
  v_ok         boolean;
begin
  -- İzinli mi? (izin aralıkları gerçek anlardır, dilimden bağımsız)
  if exists (
    select 1 from public.staff_time_off t
    where t.staff_id = p_staff_id
      and p_starts_at >= t.starts_at
      and p_starts_at <  t.ends_at
  ) then
    return false;
  end if;

  select exists(
    select 1 from public.staff_shifts s
    where s.staff_id = p_staff_id and s.is_active
  ) into v_has_shifts;
  if not v_has_shifts then return true; end if;

  -- Vardiya saatleri işletme saatindedir: anı işletme saatine çevir.
  v_local   := p_starts_at at time zone v_tz;
  v_weekday := extract(isodow from v_local)::int;   -- Pzt=1 … Paz=7
  v_time    := to_char(v_local, 'HH24:MI');

  select exists(
    select 1 from public.staff_shifts s
    where s.staff_id = p_staff_id
      and s.weekday = v_weekday
      and s.is_active
      and v_time >= s.start_time
      and v_time <  s.end_time
  ) into v_ok;

  return v_ok;
end;
$$;

revoke all on function public.is_staff_available_tz(uuid, timestamptz, text) from public, anon;
grant execute on function public.is_staff_available_tz(uuid, timestamptz, text) to authenticated;
