-- =============================================================
-- 0005_agency_access.sql
-- Ajans Paneli: işletme sahibinin, seçtiği bölümleri salt-okunur
-- olarak bir dijital ajansa token'lı bağlantıyla açması.
--
-- GÜVENLİK: anon (giriş yapmamış) kullanıcı HİÇBİR tabloya doğrudan
-- erişemez. Public panel verisi yalnızca aşağıdaki SECURITY DEFINER
-- fonksiyonu üzerinden, geçerli + süresi dolmamış bir token ile döner.
--
-- Supabase SQL Editor'da elle çalıştırın. Tekrar-güvenli yazıldı.
-- =============================================================

create table if not exists public.agency_access (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  email       text,
  token       text not null unique,
  sections    text[] not null default '{}',
  permission  text not null default 'view'
    check (permission in ('view', 'view_report')),
  expires_at  timestamptz,
  is_active   boolean not null default true,
  note        text,
  created_by  uuid references public.profiles(id)
);

create index if not exists idx_agency_access_business
  on public.agency_access(business_id);
create index if not exists idx_agency_access_token
  on public.agency_access(token);

alter table public.agency_access enable row level security;

-- Yalnızca işletme üyeleri kendi ajans erişimlerini yönetir.
drop policy if exists "agency_access_all_same_business" on public.agency_access;
create policy "agency_access_all_same_business"
  on public.agency_access for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- =============================================================
-- Public panel verisi — token ile doğrulanan SECURITY DEFINER fonksiyon.
-- Son 12 ayın özetini jsonb olarak döndürür.
-- =============================================================
create or replace function public.agency_panel(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  acc public.agency_access%rowtype;
  b uuid;
  since timestamptz := date_trunc('month', now()) - interval '11 months';
  result jsonb;
begin
  select * into acc
  from public.agency_access
  where token = p_token
    and is_active = true
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object('valid', false);
  end if;

  b := acc.business_id;

  result := jsonb_build_object(
    'valid', true,
    'business_name', (select name from public.businesses where id = b),
    'permission', acc.permission,
    'sections', to_jsonb(acc.sections),
    'expires_at', acc.expires_at,
    'data', jsonb_build_object(
      'revenue', coalesce((select sum(amount) from public.payments where business_id = b and created_at >= since), 0),
      'expense', coalesce((select sum(amount) from public.expenses where business_id = b and spent_at >= since::date), 0),
      'services_sold', coalesce((select count(*) from public.appointments where business_id = b and status = 'completed' and starts_at >= since), 0),
      'customers_total', coalesce((select count(*) from public.customers where business_id = b and is_lead = false), 0),
      'leads_total', coalesce((select count(*) from public.customers where business_id = b and is_lead = true), 0),
      'service_profitability', coalesce((
        select jsonb_agg(jsonb_build_object('name', name, 'value', val) order by val desc)
        from (
          select coalesce(s.name, 'Diğer') as name, sum(a.price) as val
          from public.appointments a
          left join public.services s on s.id = a.service_id
          where a.business_id = b and a.status = 'completed'
            and a.price is not null and a.starts_at >= since
          group by 1
        ) q
      ), '[]'::jsonb),
      'source_revenue', coalesce((
        select jsonb_agg(jsonb_build_object('name', name, 'value', val) order by val desc)
        from (
          select coalesce(nullif(trim(c.source), ''), 'Diğer') as name, sum(p.amount) as val
          from public.payments p
          left join public.customers c on c.id = p.customer_id
          where p.business_id = b and p.created_at >= since
          group by 1
        ) q
      ), '[]'::jsonb),
      'monthly', coalesce((
        select jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'ciro', ciro, 'hizmet', hizmet, 'yeni', yeni) order by m)
        from (
          select m,
            coalesce((select sum(amount) from public.payments p where p.business_id = b and date_trunc('month', p.created_at) = m), 0) as ciro,
            coalesce((select count(*) from public.appointments a where a.business_id = b and a.status = 'completed' and date_trunc('month', a.starts_at) = m), 0) as hizmet,
            coalesce((select count(*) from public.customers c where c.business_id = b and c.is_lead = false and date_trunc('month', c.created_at) = m), 0) as yeni
          from generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') as m
        ) q
      ), '[]'::jsonb),
      'recent_payments', coalesce((
        select jsonb_agg(jsonb_build_object('amount', amount, 'created_at', created_at) order by created_at desc)
        from (
          select amount, created_at from public.payments
          where business_id = b order by created_at desc limit 10
        ) q
      ), '[]'::jsonb)
    )
  );

  return result;
end;
$$;

-- Giriş yapmamış ziyaretçiler de (token ile) çağırabilsin.
grant execute on function public.agency_panel(text) to anon, authenticated;
