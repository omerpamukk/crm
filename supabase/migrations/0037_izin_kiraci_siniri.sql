-- =============================================================
-- 0037_izin_kiraci_siniri.sql
-- İzin (consents) tetikleyicisinde kiracı sınırı. Dayandığı migration'lar:
-- 0016 (consents + sync_kvkk_consent), 0032 (pazarlama izni genişletmesi).
--
-- SORUN: 0032'deki sync_kvkk_consent() `security definer` olduğu için RLS'i
-- atlar ve `update customers ... where id = new.customer_id` yalnızca müşteri
-- kimliğine bakıyordu. consents politikası yalnızca satırın business_id'sini
-- denetlediğinden, başka firmanın müşteri kimliğiyle izin satırı eklemek o
-- müşterinin izin tarihlerini değiştirebiliyordu.
--
-- Bu dosya:
--   1) sync_kvkk_consent()'i aynı davranışla, ama `business_id = new.business_id`
--      koşuluyla yeniden tanımlar (0032 sürümüyle uyumlu; PR birleşmeden de
--      canlıya uygulanabilir).
--   2) consents'e eklenen/güncellenen satırda müşterinin aynı firmaya ait
--      olduğunu zorunlu kılan bir BEFORE tetikleyici ekler.
-- Mevcut politikalara dokunmaz. Tekrar-güvenli. Kullanıcı elle çalıştırır.
-- =============================================================

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
    update public.customers set kvkk_consent_at = v_at
     where id = new.customer_id and business_id = new.business_id;
  elsif new.kind = 'sms' then
    update public.customers set marketing_sms_at = v_at
     where id = new.customer_id and business_id = new.business_id;
  elsif new.kind = 'email' then
    update public.customers set marketing_email_at = v_at
     where id = new.customer_id and business_id = new.business_id;
  end if;
  return new;
end;
$$;

create or replace function public.consents_customer_same_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.customers c
     where c.id = new.customer_id and c.business_id = new.business_id
  ) then
    raise exception 'consents: müşteri bu firmaya ait değil'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists consents_customer_same_business on public.consents;
create trigger consents_customer_same_business
  before insert or update of customer_id, business_id on public.consents
  for each row execute function public.consents_customer_same_business();

-- GERİ ALMA (elle):
--   drop trigger if exists consents_customer_same_business on public.consents;
--   drop function if exists public.consents_customer_same_business();
