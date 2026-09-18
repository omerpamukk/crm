-- =============================================================
-- 0015_roles.sql
-- Firma içi rol sistemi: owner | reception | specialist
--
-- SORUN: profiles.role sadece 'owner' | 'staff' idi ve HİÇBİR YERDE
-- uygulanmıyordu. Personel rolündeki kullanıcı tüm ciroyu, tüm giderleri
-- ve diğer personelin komisyonunu görebiliyordu.
--
-- Bu migration 3 rol tanımlar ve finansal tabloları rol bazlı kısıtlar.
--
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- =============================================================
-- 1) profiles — yeni kolonlar
-- =============================================================
alter table public.profiles
  add column if not exists phone    text,
  -- Uzman rolündeki kullanıcının hangi personel kaydı olduğu:
  -- "kendi randevularım" ve "kendi komisyonum" için gerekli
  add column if not exists staff_id uuid references public.staff(id) on delete set null;

create index if not exists idx_profiles_staff
  on public.profiles(staff_id) where staff_id is not null;

-- =============================================================
-- 2) role check'ini genişlet: staff -> reception
--    Önce mevcut veriyi taşı, sonra kısıtı yenile.
-- =============================================================
alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles set role = 'reception' where role = 'staff';

alter table public.profiles
  alter column role set default 'reception';

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('owner', 'reception', 'specialist'));

-- =============================================================
-- 3) handle_new_user() düzeltmesi
--    ESKİ HALİ: her yeni auth kullanıcısına sabit 'owner' veriyordu.
--    Admin action'ı sonradan upsert ile düzeltiyordu ama trigger yolu riskliydi.
--    YENİ HALİ: metadata'daki rolü kullanır, yoksa en kısıtlı rolü verir.
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
begin
  meta_role := new.raw_user_meta_data->>'role';

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    case
      when meta_role in ('owner', 'reception', 'specialist') then meta_role
      else 'reception'
    end
  );
  return new;
end;
$$;

-- =============================================================
-- 4) Rol yardımcı fonksiyonları
-- =============================================================
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_role() to authenticated;

-- Finansal veriyi görme yetkisi: yalnızca işletme sahibi
create or replace function public.can_see_finance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'owner', false);
$$;

grant execute on function public.can_see_finance() to authenticated;

-- Oturum açan kullanıcının bağlı olduğu staff kaydı (uzman rolü için)
create or replace function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select staff_id from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_staff_id() to authenticated;

-- =============================================================
-- 5) expenses — giderleri yalnızca işletme sahibi görsün
--    (0004'teki "for all" politikası yerine ayrık politikalar)
-- =============================================================
drop policy if exists "expenses_all_same_business" on public.expenses;

drop policy if exists "expenses_select_owner" on public.expenses;
create policy "expenses_select_owner"
  on public.expenses for select to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance());

drop policy if exists "expenses_write_owner" on public.expenses;
create policy "expenses_write_owner"
  on public.expenses for all to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance())
  with check (business_id = public.current_business_id() and public.can_see_finance());

-- =============================================================
-- 6) staff — komisyon oranı hassas veri.
--    Okuma herkese açık (randevuda personel seçilebilmeli),
--    ama yazma yalnızca işletme sahibinde.
-- =============================================================
drop policy if exists "staff_all_same_business" on public.staff;

drop policy if exists "staff_select_same_business" on public.staff;
create policy "staff_select_same_business"
  on public.staff for select to authenticated
  using (business_id = public.current_business_id());

drop policy if exists "staff_write_owner" on public.staff;
create policy "staff_write_owner"
  on public.staff for all to authenticated
  using (business_id = public.current_business_id() and public.can_see_finance())
  with check (business_id = public.current_business_id() and public.can_see_finance());

-- =============================================================
-- NOT: payments (tahsilat) kasıtlı olarak kısıtlanmadı —
-- resepsiyon ödeme alabilmeli. Gider ve komisyon owner'a özel.
-- Rapor sayfalarının rol kontrolü uygulama katmanında
-- (src/lib/permissions.ts) yapılır.
-- =============================================================
