-- =============================================================
-- 0035_musteri_ritmi.sql
-- Müşterinin ziyaret ritmi: puan ve segment bunun üstüne kurulur.
-- Dayandığı migration'lar: 0001 (appointments), 0028 (arrived).
--
-- Ziyaret = geçmiş tarihli, iptal edilmemiş ve "gelmedi" olmayan randevu.
-- Aynı gündeki birden çok randevu tek ziyaret sayılır. Böylece "Geldi"
-- işaretlemeyi unutan işletmede de ritim çıkar.
--
-- Görünüm yalnızca ham sayıları verir; puan ve segment uygulamada
-- hesaplanır (src/lib/customer-rhythm.ts, testli). Kurallar değişince
-- migration gerekmez.
--
-- security_invoker: RLS uygulanır, işletme yalnızca kendi müşterilerini görür.
-- Tekrar-güvenli. Kullanıcı elle çalıştırır. Önce BU migration, sonra kod.
-- =============================================================

create or replace view public.customer_rhythm
with (security_invoker = true) as
with tr as (
  select
    a.business_id,
    a.customer_id,
    a.starts_at,
    a.status,
    (a.starts_at at time zone 'Europe/Istanbul')::date as visit_day
  from public.appointments a
  where a.customer_id is not null
),
visits as (
  select business_id, customer_id, visit_day
  from tr
  where starts_at < now()
    and coalesce(status, 'planned') not in ('cancelled', 'no_show')
  group by business_id, customer_id, visit_day
),
agg as (
  select
    business_id,
    customer_id,
    count(*)::int        as visits,
    min(visit_day)       as first_visit,
    max(visit_day)       as last_visit
  from visits
  group by business_id, customer_id
),
counts as (
  select
    business_id,
    customer_id,
    count(*) filter (where starts_at < now())::int                                as past_total,
    count(*) filter (where starts_at < now() and status = 'no_show')::int         as no_shows,
    count(*) filter (where starts_at < now() and status = 'cancelled')::int       as cancels,
    min(starts_at) filter (where starts_at >= now()
                             and coalesce(status, 'planned') in ('planned', 'arrived')) as next_appointment
  from tr
  group by business_id, customer_id
)
select
  c.business_id,
  c.id                                   as customer_id,
  coalesce(agg.visits, 0)                as visits,
  agg.first_visit,
  agg.last_visit,
  case when agg.visits >= 2
       then round((agg.last_visit - agg.first_visit)::numeric / (agg.visits - 1), 1)
  end                                    as avg_interval_days,
  coalesce(counts.past_total, 0)         as past_total,
  coalesce(counts.no_shows, 0)           as no_shows,
  coalesce(counts.cancels, 0)            as cancels,
  counts.next_appointment
from public.customers c
left join agg    on agg.customer_id = c.id
left join counts on counts.customer_id = c.id
where c.is_lead = false;

comment on view public.customer_rhythm is
  'Müşteri başına ziyaret ritmi (ziyaret sayısı, ilk/son ziyaret, ortalama aralık, gelmedi/iptal, sıradaki randevu). Puan ve segment uygulamada hesaplanır.';

create index if not exists idx_appointments_customer_starts
  on public.appointments (customer_id, starts_at);
