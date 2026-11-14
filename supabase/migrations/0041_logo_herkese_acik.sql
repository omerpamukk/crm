-- =============================================================
-- 0041_logo_herkese_acik.sql
-- İşletme logosunu girişsiz sayfalara (açık profil, online randevu) verir.
-- Dosyalar zaten herkese açık business-logos bucket'ında (0018); burada
-- yalnızca adres okunur. Mevcut public_profile / booking_config
-- fonksiyonlarına dokunulmaz.
-- Tekrar-güvenli. Kullanıcı SQL Editor'da elle çalıştırır.
-- =============================================================

create or replace function public.public_business_logo(p_slug text, p_booking_token text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select b.logo_url
  from public.businesses b
  where (p_slug is not null and b.slug = lower(p_slug) and b.profile_public)
     or (p_booking_token is not null and b.id = (
           select s.business_id from public.booking_settings s
           where s.token = p_booking_token and s.is_active limit 1))
  limit 1;
$$;

grant execute on function public.public_business_logo(text, text) to anon, authenticated;
