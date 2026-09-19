-- =============================================================
-- 0023_integrations.sql
-- Entegrasyonlar, mesaj günlüğü, bildirimler ve hatırlatıcı kuyruğu.
--
-- GÜVENLİK: integrations.credentials hassas veri (API anahtarı, token).
-- RLS ile firma bazlı korunur; uygulama katmanında ASLA client'a
-- gönderilmez — yalnızca server action içinde okunur.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- =============================================================
-- 1) integrations — bağlı hesaplar
-- =============================================================
create table if not exists public.integrations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  provider      text not null check (provider in (
                  'whatsapp', 'sms', 'smtp', 'instagram',
                  'facebook', 'google_business', 'meta_ads')),
  status        text not null default 'disconnected'
                  check (status in ('connected', 'disconnected', 'error')),
  -- "@defnebeauty" / "0850 XXX" gibi görünen etiket
  account_label text,
  credentials   jsonb not null default '{}'::jsonb,
  last_error    text,
  connected_at  timestamptz,
  unique (business_id, provider)
);

alter table public.integrations enable row level security;

-- Yalnızca işletme sahibi (kimlik bilgisi hassas)
drop policy if exists "integrations_owner_only" on public.integrations;
create policy "integrations_owner_only"
  on public.integrations for all to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance())
  with check (business_id = public.current_business_id() and public.can_see_finance());

-- =============================================================
-- 2) message_log — giden/gelen mesaj kaydı
-- =============================================================
create table if not exists public.message_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  channel     text not null check (channel in ('sms', 'email', 'whatsapp')),
  direction   text not null default 'out' check (direction in ('in', 'out')),
  to_addr     text not null,
  subject     text,
  body        text,
  status      text not null default 'queued'
                check (status in ('queued', 'sent', 'failed', 'delivered')),
  provider_id text,
  error       text
);

alter table public.message_log enable row level security;

drop policy if exists "message_log_all_same_business" on public.message_log;
create policy "message_log_all_same_business"
  on public.message_log for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_message_log_business
  on public.message_log(business_id, created_at desc);
create index if not exists idx_message_log_customer
  on public.message_log(customer_id, created_at desc);

-- =============================================================
-- 3) notification_settings — hangi bildirim, hangi kanal, kime
-- =============================================================
create table if not exists public.notification_settings (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  key             text not null,
  enabled         boolean not null default true,
  channels        text[] not null default '{}',
  recipient_roles text[] not null default '{owner}',
  send_at         time,
  unique (business_id, key)
);

alter table public.notification_settings enable row level security;

drop policy if exists "notification_settings_all_same_business" on public.notification_settings;
create policy "notification_settings_all_same_business"
  on public.notification_settings for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- =============================================================
-- 4) notifications — kalıcı bildirim kutusu (okundu takibi ile)
-- =============================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  -- null = firmadaki herkese
  user_id     uuid references public.profiles(id) on delete cascade,
  kind        text not null check (kind in (
                'appointment', 'debt', 'birthday', 'opportunity',
                'stock', 'task', 'review', 'system')),
  title       text not null,
  detail      text,
  href        text,
  read_at     timestamptz
);

alter table public.notifications enable row level security;

drop policy if exists "notifications_all_same_business" on public.notifications;
create policy "notifications_all_same_business"
  on public.notifications for all to authenticated
  using (
    business_id = public.current_business_id()
    and (user_id is null or user_id = auth.uid())
  )
  with check (business_id = public.current_business_id());

create index if not exists idx_notifications_unread
  on public.notifications(business_id, read_at, created_at desc);

-- =============================================================
-- 5) reminders — zamanlanmış hatırlatma kuyruğu (cron tüketir)
-- =============================================================
create table if not exists public.reminders (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  customer_id  uuid references public.customers(id) on delete cascade,
  kind         text not null check (kind in (
                 'appointment', 'birthday', 'debt', 'package_done', 'custom')),
  related_type text,
  related_id   uuid,
  scheduled_at timestamptz not null,
  sent_at      timestamptz,
  status       text not null default 'pending'
                 check (status in ('pending', 'sent', 'failed', 'cancelled')),
  channel      text not null default 'sms' check (channel in ('sms', 'email', 'whatsapp')),
  body         text,
  error        text
);

alter table public.reminders enable row level security;

drop policy if exists "reminders_all_same_business" on public.reminders;
create policy "reminders_all_same_business"
  on public.reminders for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Cron'un "vadesi gelenler" sorgusu için
create index if not exists idx_reminders_due
  on public.reminders(status, scheduled_at) where status = 'pending';
create index if not exists idx_reminders_business
  on public.reminders(business_id, scheduled_at desc);
