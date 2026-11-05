-- =============================================================
-- 0027_profiles_lockdown.sql
-- Güvenlik: yetki yükseltme ve abonelik yazma açıklarını kapatır.
-- Dayanır: 0001 (profiles_update_own), 0008 (profiles_update_super,
-- subscriptions_super_all). 0026'dan BAĞIMSIZ, hemen çalıştırılabilir.
--
-- KAPATTIĞI AÇIKLAR:
--  1) profiles_update_own yalnızca SATIR kısıtlıydı, kolon değil. Herhangi
--     bir kullanıcı kendi JWT'siyle PATCH profiles {role:'owner'} veya
--     {business_id:'<başka firma>'} gönderip yetki yükseltebiliyor ya da
--     başka firmaya geçebiliyordu. Artık authenticated yalnızca full_name
--     ve phone kolonlarını güncelleyebilir.
--  2) profiles_update_super: herhangi bir ekip üyesi REST üzerinden her
--     profilin rol/firmasını değiştirebiliyordu. Uygulamadaki tüm admin
--     yazmaları service role ile yapıldığı için kaldırıldı.
--  3) subscriptions_super_all: herhangi bir admin REST üzerinden abonelik
--     yazabiliyordu. Uygulamada abonelik yazmaları service role ile
--     yapılıyor; politika yalnızca OKUMAYA indirildi.
--
-- Service role etkilenmez (RLS ve kolon izinlerini atlar). Tekrar-güvenli.
-- =============================================================

revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

drop policy if exists "profiles_update_super" on public.profiles;

drop policy if exists "subscriptions_super_all" on public.subscriptions;
drop policy if exists "subscriptions_select_super" on public.subscriptions;
create policy "subscriptions_select_super"
  on public.subscriptions for select to authenticated
  using (public.is_super_admin());
