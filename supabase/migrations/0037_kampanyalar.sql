-- =============================================================
-- 0037_kampanyalar.sql
-- Toplu SMS kampanyaları: kime, ne gönderildi ve sonucu.
-- Dayandığı migration'lar: 0001 (customers, appointments), 0003 (payments),
-- 0007 (current_business_id), 0032 (pazarlama izni).
--
-- campaigns            : bir gönderim (kitle, metin, sayılar)
-- campaign_recipients  : gönderimin alıcıları (kişi başı durum)
-- campaign_results     : sonuç görünümü — gönderimden sonraki 14 günde
--                        randevu alan alıcı sayısı ve bu alıcılardan alınan ödeme
--
-- RLS: işletme yalnızca kendi kayıtlarını görür (current_business_id()).
-- Tekrar-güvenli. Kullanıcı SQL Editor'da elle çalıştırır. Önce BU, sonra kod.
-- =============================================================

create table if not exists public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  created_by      uuid references auth.users(id) on delete set null,
  name            text not null,
  channel         text not null default 'sms' check (channel in ('sms')),
  audience        text not null,
  body            text not null,
  recipient_count int  not null default 0,
  sent_count      int  not null default 0,
  failed_count    int  not null default 0,
  status          text not null default 'sending'
                    check (status in ('sending', 'sent', 'failed')),
  sent_at         timestamptz
);

create index if not exists idx_campaigns_business_created
  on public.campaigns(business_id, created_at desc);

alter table public.campaigns enable row level security;

drop policy if exists "campaigns_all_same_business" on public.campaigns;
create policy "campaigns_all_same_business"
  on public.campaigns for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create table if not exists public.campaign_recipients (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  phone       text not null,
  status      text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  error       text,
  primary key (campaign_id, phone)
);

create index if not exists idx_campaign_recipients_customer
  on public.campaign_recipients(customer_id);

alter table public.campaign_recipients enable row level security;

drop policy if exists "campaign_recipients_all_same_business" on public.campaign_recipients;
create policy "campaign_recipients_all_same_business"
  on public.campaign_recipients for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create or replace view public.campaign_results
with (security_invoker = true) as
select
  c.id          as campaign_id,
  c.business_id,
  (
    select count(distinct a.customer_id)
    from public.campaign_recipients r
    join public.appointments a
      on a.customer_id = r.customer_id
     and a.business_id = c.business_id
    where r.campaign_id = c.id
      and r.status = 'sent'
      and a.created_at >= c.sent_at
      and a.created_at <  c.sent_at + interval '14 days'
      and coalesce(a.status, 'planned') <> 'cancelled'
  )::int        as booked,
  (
    select coalesce(sum(p.amount), 0)
    from public.payments p
    where p.business_id = c.business_id
      and p.created_at >= c.sent_at
      and p.created_at <  c.sent_at + interval '14 days'
      and p.customer_id in (
        select r.customer_id
        from public.campaign_recipients r
        where r.campaign_id = c.id and r.status = 'sent' and r.customer_id is not null
      )
  )::numeric    as revenue
from public.campaigns c
where c.sent_at is not null;

comment on view public.campaign_results is
  'Kampanya sonucu: gönderimden sonraki 14 günde randevu alan alıcı sayısı ve bu alıcılardan alınan ödeme.';
