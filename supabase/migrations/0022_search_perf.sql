-- =============================================================
-- 0022_search_perf.sql
-- Arama indeksi + eksik indeksler + ağır sorguları DB'ye taşıyan RPC'ler.
--
-- SORUNLAR:
-- 1) Komut paleti araması `ilike '%q%'` kullanıyor → baştaki % yüzünden
--    hiçbir B-tree indeksi çalışmıyor, her aramada tam tarama.
-- 2) Dashboard layout'u HER SAYFA GEZİNTİSİNDE tüm packages tablosunu
--    çekip JS'te borç hesaplıyor.
-- 3) Admin paneli tüm firmaların tüm müşteri/ödeme/randevu satırlarını
--    çekip JS'te sayıyor.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- =============================================================
-- 1) Trigram araması (Türkçe karakter toleranslı)
-- =============================================================
create extension if not exists pg_trgm;

create index if not exists idx_customers_name_trgm
  on public.customers using gin (full_name gin_trgm_ops);
create index if not exists idx_customers_phone_trgm
  on public.customers using gin (phone gin_trgm_ops);

-- =============================================================
-- 2) Eksik indeksler
-- =============================================================
create index if not exists idx_customers_assigned
  on public.customers(business_id, assigned_to) where assigned_to is not null;
create index if not exists idx_customers_birthday
  on public.customers(business_id, birthday) where birthday is not null;
create index if not exists idx_customers_status
  on public.customers(business_id, status);
create index if not exists idx_payments_related
  on public.payments(related_type, related_id) where related_id is not null;
create index if not exists idx_subscriptions_status
  on public.subscriptions(status, expires_at);
create index if not exists idx_expenses_category
  on public.expenses(business_id, category, spent_at desc);
create index if not exists idx_appointments_staff_member
  on public.appointments(business_id, staff_member_id, starts_at);

-- =============================================================
-- 3) sidebar_badges() — layout'un 5 sorgusu tek çağrıda
-- =============================================================
create or replace function public.sidebar_badges()
returns json
language sql
stable
security definer
set search_path = public
as $$
  with biz as (select public.current_business_id() as id),
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
    from public.appointments a, biz
    where a.business_id = biz.id
      and a.status = 'planned'
      and a.starts_at >= date_trunc('day', now())
      and a.starts_at <  date_trunc('day', now()) + interval '1 day'
  ),
  upcoming as (
    select count(*) as n
    from public.appointments a, biz
    where a.business_id = biz.id
      and a.status = 'planned'
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
-- 4) platform_stats() — admin panelinin firma başına sayıları
--    (yalnızca süper-admin çağırabilir)
-- =============================================================
create or replace function public.platform_stats()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_super_admin() then '[]'::json
    else coalesce((
      select json_agg(row_to_json(t))
      from (
        select
          b.id,
          (select count(*) from public.profiles p where p.business_id = b.id)    as users,
          (select count(*) from public.customers c where c.business_id = b.id
             and not coalesce(c.is_lead, false))                                as customers,
          (select count(*) from public.appointments a where a.business_id = b.id) as appointments,
          (select coalesce(sum(pay.amount), 0) from public.payments pay
             where pay.business_id = b.id)                                       as revenue,
          (select coalesce(sum(pay.amount), 0) from public.payments pay
             where pay.business_id = b.id
               and pay.created_at >= date_trunc('month', now()))                 as month_revenue
        from public.businesses b
      ) t
    ), '[]'::json)
  end;
$$;

grant execute on function public.platform_stats() to authenticated;

-- =============================================================
-- 5) search_customers() — trigram destekli, indeks kullanan arama
-- =============================================================
create or replace function public.search_customers(p_query text)
returns table (
  id        uuid,
  full_name text,
  phone     text,
  is_lead   boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.full_name, c.phone, coalesce(c.is_lead, false)
  from public.customers c
  where c.business_id = public.current_business_id()
    and (
      c.full_name ilike '%' || p_query || '%'
      or c.phone   ilike '%' || p_query || '%'
      or c.email   ilike '%' || p_query || '%'
    )
  order by
    -- Baştan eşleşenler önce
    case when c.full_name ilike p_query || '%' then 0 else 1 end,
    similarity(c.full_name, p_query) desc,
    c.full_name
  limit 8;
$$;

grant execute on function public.search_customers(text) to authenticated;
