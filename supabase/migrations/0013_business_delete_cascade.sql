-- =============================================================
-- 0013_business_delete_cascade.sql
-- Firma silindiğinde tüm bağlı kayıtlar otomatik silinsin.
--
-- 0001'deki tablolar (profiles, customers, services, appointments, packages)
-- businesses'a ON DELETE CASCADE OLMADAN bağlıydı → firma silinemiyordu.
-- Bu migration o FK kısıtlarını cascade olacak şekilde yeniden kurar.
-- (0002+ tablolar zaten cascade.)
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

alter table public.profiles      drop constraint if exists profiles_business_id_fkey;
alter table public.profiles      add  constraint profiles_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete cascade;

alter table public.customers     drop constraint if exists customers_business_id_fkey;
alter table public.customers     add  constraint customers_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete cascade;

alter table public.services      drop constraint if exists services_business_id_fkey;
alter table public.services      add  constraint services_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete cascade;

alter table public.appointments  drop constraint if exists appointments_business_id_fkey;
alter table public.appointments  add  constraint appointments_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete cascade;

alter table public.packages      drop constraint if exists packages_business_id_fkey;
alter table public.packages      add  constraint packages_business_id_fkey
  foreign key (business_id) references public.businesses(id) on delete cascade;

-- Firma silme yalnızca server action + service_role ile yapılır (kurucu kapısı).
