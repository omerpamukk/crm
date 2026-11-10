-- =============================================================
-- 0031_musteri_bakiye.sql
-- Müşteri borcu TEK KAYNAK. Dayandığı migration'lar: 0003 (payments + paket
-- tetikleyicisi), 0007 (customer_summary), 0028/0030 (sidebar_badges).
--
-- Tanım (her ekran ve rozet aynısını kullanır):
--   Satış   = paket fiyatları + pakete bağlı OLMAYAN tamamlanmış randevu fiyatları
--   Ödeme   = müşterinin payments tablosundaki tüm kayıtları
--   Bakiye  = Satış - Ödeme            (> 0 ise borçlu)
--   Gecikmiş tutar = max(0, "30 günden eski satışlar" - Ödeme)
--       Ödemeler en eski satıştan başlayarak düşülür (FIFO). Gün, satış
--       tarihinden sayılır (paket: purchased_at, yoksa created_at; hizmet: starts_at).
--   Yalnızca müşteriler (is_lead = false) hesaplanır.
--
-- Bu dosya:
--   1) customer_balances görünümü (security_invoker: RLS uygulanır)
--   2) Geçmiş düzeltme: "Peşin ödenen" yalnızca packages.paid_amount'a yazılmış,
--      payments'a kayıt düşmemişti. Eksik ödeme kayıtları eklenir (tetikleyici
--      geçici kapatılır ki paid_amount ikinci kez artmasın). Eklenen kayıtlar
--      yedek tabloda tutulur. Tekrar çalıştırmak yeni kayıt eklemez.
--   3) sidebar_badges() gecikmiş sayısını görünümden alır (0030 sürümü +
--      yalnızca overdue CTE'si değişti).
--
-- Kullanıcı elle çalıştırır. Kodla sıralama: önce BU migration, sonra kod.
-- =============================================================

-- 1) Görünüm ---------------------------------------------------
create or replace view public.customer_balances
with (security_invoker = true) as
with charge as (
  select p.business_id, p.customer_id,
         coalesce(p.purchased_at, p.created_at) as at,
         p.price as amount
  from public.packages p
  where p.customer_id is not null and coalesce(p.price, 0) > 0
  union all
  select a.business_id, a.customer_id, a.starts_at, a.price
  from public.appointments a
  where a.status = 'completed'
    and a.package_id is null
    and a.customer_id is not null
    and coalesce(a.price, 0) > 0
),
ch as (
  select customer_id,
         sum(amount) as charges,
         sum(amount) filter (where at < now() - interval '30 days') as old_charges
  from charge
  group by customer_id
),
pay as (
  select customer_id, sum(amount) as paid, max(created_at) as last_payment_at
  from public.payments
  where customer_id is not null
  group by customer_id
)
select
  c.business_id,
  c.id                                                   as customer_id,
  c.full_name,
  c.phone,
  coalesce(ch.charges, 0)                                as charges,
  coalesce(pay.paid, 0)                                  as payments,
  round(coalesce(ch.charges, 0) - coalesce(pay.paid, 0), 2) as balance,
  round(greatest(coalesce(ch.old_charges, 0) - coalesce(pay.paid, 0), 0), 2) as overdue_amount,
  pay.last_payment_at
from public.customers c
left join ch  on ch.customer_id  = c.id
left join pay on pay.customer_id = c.id
where not coalesce(c.is_lead, false)
  and (ch.customer_id is not null or pay.customer_id is not null);

grant select on public.customer_balances to authenticated;

-- 2) Geçmiş düzeltme -------------------------------------------
create table if not exists public.payments_peshin_yedek_0031 (
  payment_id  uuid primary key,
  package_id  uuid not null,
  amount      numeric not null,
  created_at  timestamptz not null default now()
);
alter table public.payments_peshin_yedek_0031 enable row level security;
-- Politika yok: yalnızca SQL Editor (service role) erişir.

do $$
begin
  alter table public.payments disable trigger on_payment_insert;

  with eksik as (
    select p.id as package_id, p.business_id, p.customer_id,
           p.paid_amount - coalesce((
             select sum(pay.amount) from public.payments pay
             where pay.related_type = 'paket' and pay.related_id = p.id
           ), 0) as fark,
           coalesce(p.purchased_at, p.created_at) as tarih
    from public.packages p
    where p.customer_id is not null and coalesce(p.paid_amount, 0) > 0
  ),
  ins as (
    insert into public.payments
      (business_id, customer_id, amount, method, related_type, related_id, note, created_at)
    select business_id, customer_id, fark, 'diger', 'paket', package_id,
           'Peşin ödeme (geçmiş kayıt düzeltmesi)', tarih
    from eksik
    where fark > 0
    returning id, related_id, amount
  )
  insert into public.payments_peshin_yedek_0031 (payment_id, package_id, amount)
  select id, related_id, amount from ins;

  alter table public.payments enable trigger on_payment_insert;
end;
$$;

-- 3) sidebar_badges -------------------------------------------
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
    select count(*) as n
    from public.customer_balances cb, biz
    where cb.business_id = biz.id
      and cb.overdue_amount > 0
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
-- GERİ ALMA (elle; bu migration'ın parçası DEĞİLDİR):
--   -- Eklenen düzeltme ödemelerini sil (silme tetikleyicisi yok, paid_amount değişmez):
--   delete from public.payments where id in (select payment_id from public.payments_peshin_yedek_0031);
--   -- sidebar_badges'i 0030 sürümüne döndürmek için 0030'daki fonksiyon bölümünü yeniden çalıştırın.
--   drop view if exists public.customer_balances;
-- =============================================================
