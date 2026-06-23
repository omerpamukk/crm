-- =============================================================
-- 0003_relationships_and_payments.sql
-- Araçlar arası ilişkiler + gelir omurgası (payments) + trigger'lar
--
-- NOT: appointments.status için "tamamlandı" değeri = 'completed'
-- (uygulamanın yazdığı gerçek değer; APPOINTMENT_STATUSES ile teyit edildi).
--
-- Bu dosyayı Supabase SQL Editor'da elle çalıştırın. Tekrar-güvenli yazıldı.
-- =============================================================

-- =============================================================
-- 1) appointments — paket bağlantısı + ücret
-- =============================================================

alter table public.appointments
  add column if not exists package_id uuid references public.packages(id),
  add column if not exists price numeric;

create index if not exists idx_appointments_package
  on public.appointments(package_id);

-- =============================================================
-- 2) payments — tahsilat / gelir defteri
-- =============================================================

create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  customer_id  uuid references public.customers(id),
  amount       numeric not null,
  method       text not null default 'nakit'
    check (method in ('nakit', 'kart', 'havale', 'diger')),
  related_type text check (related_type in ('paket', 'randevu', 'diger')),
  related_id   uuid,
  note         text,
  created_by   uuid references public.profiles(id)
);

create index if not exists idx_payments_business_created
  on public.payments(business_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "payments_all_same_business" on public.payments;
create policy "payments_all_same_business"
  on public.payments for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- =============================================================
-- 3) TETİKLEYİCİLER
-- =============================================================

-- a) Randevu "tamamlandı"ya GEÇTİĞİNDE (her update'te değil):
--    - müşterinin last_visit_at'ini güncelle
--    - bağlı paket varsa seans düş (0'ın altına inme)
--    - zaman çizelgesine kayıt ekle
create or replace function public.handle_appointment_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and (old.status is distinct from 'completed') then
    if new.customer_id is not null then
      update public.customers
        set last_visit_at = new.starts_at
        where id = new.customer_id;

      insert into public.interactions
        (business_id, customer_id, type, note, created_by)
      values
        (new.business_id, new.customer_id, 'randevu_tamamlandi',
         'Randevu tamamlandı', null);
    end if;

    if new.package_id is not null then
      update public.packages
        set remaining_sessions = greatest(coalesce(remaining_sessions, 0) - 1, 0)
        where id = new.package_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_appointment_completed on public.appointments;
create trigger on_appointment_completed
  after update on public.appointments
  for each row
  execute function public.handle_appointment_completed();

-- b) Pakete bağlı ödeme eklendiğinde paid_amount ve payment_status güncelle.
create or replace function public.handle_payment_for_package()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.related_type = 'paket' and new.related_id is not null then
    update public.packages
      set paid_amount = coalesce(paid_amount, 0) + new.amount,
          payment_status = case
            when coalesce(paid_amount, 0) + new.amount <= 0 then 'odenmedi'
            when price is null then 'odendi'
            when coalesce(paid_amount, 0) + new.amount >= price then 'odendi'
            else 'kismi'
          end
      where id = new.related_id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_payment_insert on public.payments;
create trigger on_payment_insert
  after insert on public.payments
  for each row
  execute function public.handle_payment_for_package();

-- =============================================================
-- 4) MEVCUT VERİYİ DÜZELT — payment_status'u paid_amount/price kuralına çek
-- =============================================================

update public.packages
set payment_status = case
  when coalesce(paid_amount, 0) <= 0 then 'odenmedi'
  when price is null then 'odendi'
  when coalesce(paid_amount, 0) >= price then 'odendi'
  else 'kismi'
end;
