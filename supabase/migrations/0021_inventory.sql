-- =============================================================
-- 0021_inventory.sql
-- Stok takibi — ölü /stok sayfası gerçekleşiyor.
--
-- 151 satırlık arayüz vardı ama tamamen sabit dizi üzerinde
-- çalışıyordu ve menüde bile yoktu.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- =============================================================
-- 1) products — ürün/malzeme kartı
-- =============================================================
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  name           text not null,
  sku            text,
  category       text,
  -- adet / ml / gr / kutu
  unit           text not null default 'adet',
  stock_qty      numeric not null default 0,
  critical_level numeric not null default 0 check (critical_level >= 0),
  cost_price     numeric,
  sale_price     numeric,
  is_active      boolean not null default true
);

alter table public.products enable row level security;

drop policy if exists "products_all_same_business" on public.products;
create policy "products_all_same_business"
  on public.products for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_products_business
  on public.products(business_id, is_active);
create unique index if not exists idx_products_sku
  on public.products(business_id, sku) where sku is not null;

-- =============================================================
-- 2) stock_movements — giriş / çıkış / sayım / seansta tüketim
-- =============================================================
create table if not exists public.stock_movements (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  kind         text not null check (kind in ('in', 'out', 'adjust', 'consume')),
  -- adjust: mutlak sayım değeri; diğerleri: değişim miktarı (pozitif)
  qty          numeric not null,
  related_type text,
  related_id   uuid,
  note         text,
  created_by   uuid references public.profiles(id) on delete set null
);

alter table public.stock_movements enable row level security;

drop policy if exists "stock_movements_all_same_business" on public.stock_movements;
create policy "stock_movements_all_same_business"
  on public.stock_movements for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_stock_movements_product
  on public.stock_movements(product_id, created_at desc);

-- =============================================================
-- 3) Hareket eklenince stok miktarı otomatik güncellensin
-- =============================================================
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.kind = 'in' then
    update public.products
      set stock_qty = stock_qty + new.qty
      where id = new.product_id;
  elsif new.kind in ('out', 'consume') then
    -- Negatife düşürme
    update public.products
      set stock_qty = greatest(stock_qty - new.qty, 0)
      where id = new.product_id;
  elsif new.kind = 'adjust' then
    update public.products
      set stock_qty = greatest(new.qty, 0)
      where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_stock_movement on public.stock_movements;
create trigger on_stock_movement
  after insert on public.stock_movements
  for each row
  execute function public.apply_stock_movement();
