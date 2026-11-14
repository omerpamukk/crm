-- =============================================================
-- 0032_pazarlama_izni.sql
-- Ticari elektronik ileti (İYS) izni. Dayandığı migration: 0016 (consents).
--
-- consents tablosu 'sms' ve 'email' türlerini zaten destekliyor ama hiçbir
-- ekran bu türleri yazmıyordu. Bu dosya:
--   1) customers üzerine izin tarihlerini ekler (planlayıcı tek sorguda
--      süzebilsin diye): marketing_sms_at (SMS + WhatsApp = İYS "MESAJ"),
--      marketing_email_at (İYS "E-POSTA").
--   2) 0016'daki sync fonksiyonunu bu iki türü de eşitleyecek şekilde
--      genişletir. KVKK davranışı aynen korunur.
--   3) Var olan izin kayıtlarından sütunları bir kez doldurur.
--
-- Randevu hatırlatması ve borç bildirimi bilgilendirme mesajıdır, izin
-- aranmaz. Doğum günü, geri kazanım, paket yenileme ve indirim mesajları
-- ticaridir; yalnızca izinli müşterilere gider (src/lib/automations).
--
-- Tekrar-güvenli. Kullanıcı elle çalıştırır. Önce BU migration, sonra kod.
-- =============================================================

alter table public.customers
  add column if not exists marketing_sms_at   timestamptz,
  add column if not exists marketing_email_at timestamptz;

comment on column public.customers.marketing_sms_at is
  'SMS/WhatsApp ticari ileti izninin verildiği an; izin yoksa null. consents tablosundan eşitlenir.';
comment on column public.customers.marketing_email_at is
  'E-posta ticari ileti izninin verildiği an; izin yoksa null. consents tablosundan eşitlenir.';

create or replace function public.sync_kvkk_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at timestamptz := case
    when new.granted and new.revoked_at is null then new.granted_at
    else null
  end;
begin
  if new.kind = 'kvkk' then
    update public.customers set kvkk_consent_at = v_at where id = new.customer_id;
  elsif new.kind = 'sms' then
    update public.customers set marketing_sms_at = v_at where id = new.customer_id;
  elsif new.kind = 'email' then
    update public.customers set marketing_email_at = v_at where id = new.customer_id;
  end if;
  return new;
end;
$$;

update public.customers c
   set marketing_sms_at = s.granted_at
  from public.consents s
 where s.customer_id = c.id
   and s.kind = 'sms'
   and s.granted
   and s.revoked_at is null
   and c.marketing_sms_at is null;

update public.customers c
   set marketing_email_at = s.granted_at
  from public.consents s
 where s.customer_id = c.id
   and s.kind = 'email'
   and s.granted
   and s.revoked_at is null
   and c.marketing_email_at is null;

create index if not exists idx_customers_marketing_sms
  on public.customers (business_id)
  where marketing_sms_at is not null;
