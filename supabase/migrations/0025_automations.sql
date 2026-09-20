-- =============================================================
-- 0025_automations.sql
--
-- Otomatik hatırlatma kuralları.
--
-- "Otomasyonlar" ve "Hatırlatıcılar" sayfaları tek sayfada birleşti;
-- kurallar o güne kadar yalnızca useState'te tutuluyordu (sayfa
-- yenilenince kayboluyordu). Bu migration kuralları kalıcılaştırır.
--
-- Akış:
--   automations (kural tanımı)
--     → cron /api/cron/reminders kuralları okur
--     → vadesi gelenler için reminders satırı üretir
--     → mevcut gönderim hattı (message_log) çalışır
--
-- Tekrar-güvenli: if not exists / drop policy if exists.
-- =============================================================

create table if not exists public.automations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  business_id   uuid not null references public.businesses(id) on delete cascade,

  title         text not null,
  active        boolean not null default true,

  -- Tetikleyici: ne olduğunda çalışsın
  trigger_id    text not null check (trigger_id in (
                  'randevu_oncesi',      -- randevudan N saat önce
                  'randevu_tamamlandi',  -- randevu bitince
                  'noshow',              -- randevuya gelinmedi
                  'yeni_lead',
                  'yeni_musteri',
                  'odeme_alindi',
                  'odeme_gecikti',       -- vadeden N gün sonra
                  'paket_bitiyor',       -- N seans kalınca
                  'pasif_musteri',       -- N gündür gelmiyor
                  'dogum_gunu')),
  -- Tetikleyicinin sayısal parametresi (saat / gün / seans).
  -- Parametresiz tetikleyicilerde null.
  trigger_param integer,

  -- Aksiyon: ne yapsın
  action_id     text not null check (action_id in (
                  'wa',           -- WhatsApp mesajı
                  'sms',
                  'eposta',
                  'indirim',      -- indirim/kupon mesajı
                  'hatirlatma',   -- panel içi hatırlatma
                  'gorev',        -- ekibe görev aç
                  'etiket_ekle')),
  -- Aksiyonun metin parametresi (eklenecek etiket gibi).
  action_param  text,

  -- Gönderilecek mesaj şablonu. {ad} gibi yer tutucular içerebilir.
  message       text,

  -- Son çalışma izi (hata ayıklama ve "en son ne zaman çalıştı" için)
  last_run_at   timestamptz,
  run_count     integer not null default 0
);

comment on table public.automations is
  'Otomatik hatırlatma kuralları; cron bunları okuyup reminders üretir.';
comment on column public.automations.trigger_param is
  'Tetikleyicinin sayısal parametresi: saat (randevu_oncesi), gün (odeme_gecikti, pasif_musteri) veya seans (paket_bitiyor).';

alter table public.automations enable row level security;

drop policy if exists "automations_all_same_business" on public.automations;
create policy "automations_all_same_business"
  on public.automations for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Cron yalnızca aktif kuralları tarar.
create index if not exists idx_automations_active
  on public.automations (business_id, active)
  where active;

-- =============================================================
-- reminders: hangi kuraldan doğduğunu izleyebilmek için
-- =============================================================

alter table public.reminders
  add column if not exists automation_id uuid
    references public.automations(id) on delete set null;

-- Aynı kural + aynı müşteri + aynı zaman için ikinci bir hatırlatma
-- üretilmesini engeller (cron tekrar çalışsa bile mükerrer gönderim olmaz).
create unique index if not exists uq_reminders_automation_once
  on public.reminders (automation_id, customer_id, scheduled_at)
  where automation_id is not null;
