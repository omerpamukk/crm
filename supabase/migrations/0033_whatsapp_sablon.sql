-- =============================================================
-- 0033_whatsapp_sablon.sql
-- WhatsApp kurallarında Meta onaylı şablon. Dayandığı migration: 0025.
--
-- İşletmenin başlattığı WhatsApp mesajları (hatırlatma, doğum günü, geri
-- kazanım) yalnızca Meta onaylı şablonla gider; serbest metin API'de
-- reddedilir. Kural, şablonun Meta'daki adını ve dilini tutar. Şablon
-- gövdesinde en fazla bir değişken olmalı: {{1}} = müşterinin adı.
--
-- `message` sütunu kalır: SMS/e-posta kurallarında gönderilen metin,
-- WhatsApp kurallarında ise şablonun panelde gösterilen önizlemesidir.
--
-- Tekrar-güvenli. Kullanıcı elle çalıştırır. Önce BU migration, sonra kod.
-- =============================================================

alter table public.automations
  add column if not exists wa_template      text,
  add column if not exists wa_template_lang text not null default 'tr';

comment on column public.automations.wa_template is
  'Meta onaylı WhatsApp şablonunun adı (ör. randevu_hatirlatma). Yalnızca WhatsApp aksiyonlarında kullanılır.';
comment on column public.automations.wa_template_lang is
  'Şablonun Meta''daki dil kodu (ör. tr).';
