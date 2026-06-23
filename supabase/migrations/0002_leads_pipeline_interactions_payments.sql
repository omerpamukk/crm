-- =============================================================
-- 0002_leads_pipeline_interactions_payments.sql
-- (A) Esnek lead pipeline (kanban) — pipeline_stages
-- (B) Etkileşim zaman çizelgesi — interactions
-- (C) Paket ödeme/borç takibi — packages.paid_amount/payment_status
-- + customers'a lead alanları
--
-- Bu dosyayı Supabase SQL Editor'da elle çalıştırın.
-- Tek seferde çalıştırılacak şekilde, mümkün olduğunca tekrar-güvenli yazıldı.
-- =============================================================

-- =============================================================
-- 1) pipeline_stages — firmanın kendi düzenleyebildiği kanban kolonları
-- =============================================================

create table if not exists public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name        text not null,
  color       text not null default '#3B82F6',
  position    int not null
);

create index if not exists idx_pipeline_stages_business_position
  on public.pipeline_stages(business_id, position);

alter table public.pipeline_stages enable row level security;

drop policy if exists "pipeline_stages_all_same_business" on public.pipeline_stages;
create policy "pipeline_stages_all_same_business"
  on public.pipeline_stages for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Mevcut her işletme için 4 varsayılan sütun (yalnızca hiç sütunu olmayanlara).
-- Bu sütunlar kilitli değildir; kullanıcı sonradan düzenleyebilir/silebilir.
insert into public.pipeline_stages (business_id, name, color, position)
select b.id, v.name, v.color, v.position
from public.businesses b
cross join (values
  ('Yeni Lead', '#3B82F6', 0),
  ('İletişimde', '#F59E0B', 1),
  ('Randevu Planlandı', '#5B5BD6', 2),
  ('Kazanıldı', '#16A34A', 3)
) as v(name, color, position)
where not exists (
  select 1 from public.pipeline_stages ps where ps.business_id = b.id
);

-- =============================================================
-- 2) customers — lead alanları
-- =============================================================

alter table public.customers
  add column if not exists is_lead boolean not null default true,
  add column if not exists assigned_to uuid references public.profiles(id),
  add column if not exists pipeline_stage_id uuid references public.pipeline_stages(id);

-- Mevcut kayıtlar: status='new' olanlar lead, diğerleri dönüşmüş müşteri.
update public.customers
set is_lead = coalesce(status = 'new', false);

-- Lead olanları kendi işletmesinin "Yeni Lead" (position 0) sütununa yerleştir.
update public.customers c
set pipeline_stage_id = ps.id
from public.pipeline_stages ps
where ps.business_id = c.business_id
  and ps.position = 0
  and c.is_lead = true
  and c.pipeline_stage_id is null;

create index if not exists idx_customers_pipeline_stage
  on public.customers(pipeline_stage_id);

-- =============================================================
-- 3) interactions — etkileşim / zaman çizelgesi kaydı
-- =============================================================

create table if not exists public.interactions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  type        text not null check (
    type in (
      'mesaj',
      'arama',
      'randevu_olusturuldu',
      'randevu_tamamlandi',
      'not',
      'asama_degisikligi'
    )
  ),
  note        text,
  created_by  uuid references public.profiles(id)
);

create index if not exists idx_interactions_customer_created
  on public.interactions(customer_id, created_at desc);

alter table public.interactions enable row level security;

drop policy if exists "interactions_all_same_business" on public.interactions;
create policy "interactions_all_same_business"
  on public.interactions for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- =============================================================
-- 4) packages — ödeme / borç takibi
-- =============================================================

alter table public.packages
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists payment_status text not null default 'odenmedi'
    check (payment_status in ('odendi', 'kismi', 'odenmedi'));
