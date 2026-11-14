-- =============================================================
-- 0040_sadakat_onay_profil.sql
-- Üç küçük özellik, tek dosya:
--   1) Sadakat kartı: "N. ziyarette hediye" (işletme ayarı + hediye kayıtları)
--   2) Randevu onayı: hatırlatmadaki link → "Geliyorum / Gelemiyorum"
--   3) Herkese açık işletme sayfası: hizmetler, saatler, gerçek puan
-- Dayandığı migration'lar: 0001, 0006 (booking_settings, services.bookable),
-- 0007 (slug), 0023 (notifications), 0039 (feedback_requests).
--
-- Token ile çalışan fonksiyonlar security definer'dır ve yalnızca o tek
-- satıra dokunur. Tekrar-güvenli. Kullanıcı SQL Editor'da elle çalıştırır.
-- =============================================================

-- -------------------------------------------------------------
-- 1) Sadakat kartı
-- -------------------------------------------------------------
alter table public.businesses
  add column if not exists loyalty_target smallint check (loyalty_target between 2 and 50),
  add column if not exists loyalty_reward text check (char_length(loyalty_reward) <= 120),
  add column if not exists loyalty_notify_before smallint check (loyalty_notify_before between 1 and 5);

comment on column public.businesses.loyalty_target is 'Sadakat kartı: kaçıncı ziyarette hediye (null = kapalı).';

create table if not exists public.loyalty_redemptions (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  created_by  uuid references auth.users(id) on delete set null,
  reward      text,
  visits      smallint not null
);

create index if not exists idx_loyalty_redemptions_customer
  on public.loyalty_redemptions(customer_id, created_at desc);

alter table public.loyalty_redemptions enable row level security;

drop policy if exists "loyalty_redemptions_all_same_business" on public.loyalty_redemptions;
create policy "loyalty_redemptions_all_same_business"
  on public.loyalty_redemptions for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- -------------------------------------------------------------
-- 2) Randevu onayı
-- -------------------------------------------------------------
alter table public.appointments
  add column if not exists confirm_token text default replace(gen_random_uuid()::text, '-', ''),
  add column if not exists confirmed_at  timestamptz,
  add column if not exists declined_at   timestamptz;

update public.appointments
   set confirm_token = replace(gen_random_uuid()::text, '-', '')
 where confirm_token is null;

create unique index if not exists uq_appointments_confirm_token
  on public.appointments(confirm_token);

create or replace function public.appointment_confirm_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.appointments%rowtype;
begin
  select * into a from public.appointments where confirm_token = p_token limit 1;
  if not found then
    return jsonb_build_object('valid', false);
  end if;
  return jsonb_build_object(
    'valid', true,
    'business_name', (select name from public.businesses where id = a.business_id),
    'business_phone', (select phone from public.businesses where id = a.business_id),
    'timezone', (select timezone from public.businesses where id = a.business_id),
    'starts_at', a.starts_at,
    'service', (select name from public.services where id = a.service_id),
    'first_name', (select split_part(trim(full_name), ' ', 1) from public.customers where id = a.customer_id),
    'status', coalesce(a.status, 'planned'),
    'confirmed', a.confirmed_at is not null,
    'declined', a.declined_at is not null,
    'past', a.starts_at < now()
  );
end;
$$;

grant execute on function public.appointment_confirm_info(text) to anon, authenticated;

create or replace function public.appointment_respond(p_token text, p_coming boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.appointments%rowtype;
  v_name text;
begin
  select * into a from public.appointments
   where confirm_token = p_token
     and starts_at > now()
     and coalesce(status, 'planned') = 'planned'
   limit 1
   for update;
  if not found then
    return jsonb_build_object('ok', false);
  end if;

  if p_coming then
    update public.appointments set confirmed_at = now(), declined_at = null where id = a.id;
  else
    update public.appointments
       set status = 'cancelled', declined_at = now(), confirmed_at = null
     where id = a.id;
    select full_name into v_name from public.customers where id = a.customer_id;
    insert into public.notifications (business_id, kind, title, detail, href)
    values (
      a.business_id,
      'appointment',
      'Randevu iptal edildi',
      coalesce(v_name, 'Müşteri') || ' gelemeyeceğini bildirdi · '
        || to_char(a.starts_at at time zone coalesce((select timezone from public.businesses where id = a.business_id), 'Europe/Istanbul'), 'DD.MM HH24:MI'),
      '/takvim'
    );
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.appointment_respond(text, boolean) to anon, authenticated;

-- -------------------------------------------------------------
-- 3) Herkese açık işletme sayfası
-- -------------------------------------------------------------
alter table public.businesses
  add column if not exists profile_public boolean not null default false,
  add column if not exists profile_about  text check (char_length(profile_about) <= 600);

-- Yorumun profilde görünmesine müşteri izin verdi mi (0039 akışına ek).
alter table public.feedback_requests
  add column if not exists publish boolean not null default false;

create or replace function public.submit_feedback(
  p_token text,
  p_rating int,
  p_comment text,
  p_wants_call boolean,
  p_publish boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  res jsonb;
begin
  res := public.submit_feedback(p_token, p_rating, p_comment, p_wants_call);
  if (res ->> 'ok')::boolean then
    update public.feedback_requests set publish = coalesce(p_publish, false) where token = p_token;
  end if;
  return res;
end;
$$;

grant execute on function public.submit_feedback(text, int, text, boolean, boolean) to anon, authenticated;

create or replace function public.public_profile(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.businesses%rowtype;
  v_booking text;
begin
  select * into b from public.businesses
   where slug = lower(p_slug) and profile_public = true
   limit 1;
  if not found then
    return jsonb_build_object('valid', false);
  end if;

  select token into v_booking from public.booking_settings
   where business_id = b.id and is_active = true limit 1;
  if b.enabled_modules is not null
     and not ('randevu_linki' = any(b.enabled_modules))
     and 'v2' = any(b.enabled_modules) then
    v_booking := null;
  end if;

  return jsonb_build_object(
    'valid', true,
    'name', b.name,
    'sector', b.sector,
    'about', b.profile_about,
    'phone', b.phone,
    'address', b.address,
    'working_hours', b.working_hours,
    'booking_token', v_booking,
    'google_url', b.google_review_url,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('name', s.name, 'price', s.price, 'duration_min', s.duration_min) order by s.name)
      from public.services s
      where s.business_id = b.id and coalesce(s.bookable, true) = true
    ), '[]'::jsonb),
    'rating_avg', (
      select round(avg(f.rating)::numeric, 1) from public.feedback_requests f
      where f.business_id = b.id and f.rating is not null
    ),
    'rating_count', (
      select count(*) from public.feedback_requests f
      where f.business_id = b.id and f.rating is not null
    ),
    'reviews', coalesce((
      select jsonb_agg(x order by x ->> 'date' desc)
      from (
        select jsonb_build_object(
          'author', split_part(trim(c.full_name), ' ', 1)
                    || coalesce(' ' || left(nullif(split_part(trim(c.full_name), ' ', 2), ''), 1) || '.', ''),
          'rating', f.rating,
          'comment', f.comment,
          'date', f.answered_at
        ) as x
        from public.feedback_requests f
        join public.customers c on c.id = f.customer_id
        where f.business_id = b.id and f.publish and f.comment is not null
        order by f.answered_at desc
        limit 12
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.public_profile(text) to anon, authenticated;
