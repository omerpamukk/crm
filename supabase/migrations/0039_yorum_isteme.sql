-- =============================================================
-- 0039_yorum_isteme.sql
-- Ziyaret sonrası memnuniyet sorusu ve Google yorum daveti.
-- Dayandığı migration'lar: 0001, 0023 (notifications), 0025 (automations).
--
-- Akış: ilk kez gelen müşteriye akşam SMS gider → /yorum/<token> sayfası →
-- 1–5 puan. Google yorum düğmesi HERKESE gösterilir (Google kuralı: yalnızca
-- memnunlardan yorum istemek yasak). 1–3 puan verene ayrıca "bize yazın"
-- kutusu çıkar; yazılan yalnızca işletmeye düşer ve bildirim oluşur.
--
-- feedback_requests : her istek (randevu başına en fazla bir)
-- feedback_info / submit_feedback / feedback_google_click : token ile
--   giriş yapmadan çalışan sayfa için (security definer, yalnızca o satır)
--
-- Tekrar-güvenli. Kullanıcı SQL Editor'da elle çalıştırır. Önce BU, sonra kod.
-- =============================================================

alter table public.businesses
  add column if not exists google_review_url text;

comment on column public.businesses.google_review_url is
  'Google işletme profilindeki "yorum yaz" bağlantısı (yorum isteme sayfasında gösterilir).';

create table if not exists public.feedback_requests (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  business_id       uuid not null references public.businesses(id) on delete cascade,
  customer_id       uuid references public.customers(id) on delete cascade,
  appointment_id    uuid references public.appointments(id) on delete set null,
  token             text not null unique default replace(gen_random_uuid()::text, '-', ''),
  rating            smallint check (rating between 1 and 5),
  comment           text check (char_length(comment) <= 1000),
  wants_call        boolean not null default false,
  answered_at       timestamptz,
  google_clicked_at timestamptz,
  handled_at        timestamptz
);

create unique index if not exists uq_feedback_appointment
  on public.feedback_requests(appointment_id) where appointment_id is not null;

create index if not exists idx_feedback_business_created
  on public.feedback_requests(business_id, created_at desc);

create index if not exists idx_feedback_customer
  on public.feedback_requests(customer_id);

alter table public.feedback_requests enable row level security;

drop policy if exists "feedback_requests_all_same_business" on public.feedback_requests;
create policy "feedback_requests_all_same_business"
  on public.feedback_requests for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- -------------------------------------------------------------
-- Token ile okuma (giriş yok)
-- -------------------------------------------------------------
create or replace function public.feedback_info(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.feedback_requests%rowtype;
begin
  select * into f from public.feedback_requests where token = p_token limit 1;
  if not found then
    return jsonb_build_object('valid', false);
  end if;
  return jsonb_build_object(
    'valid', true,
    'business_name', (select name from public.businesses where id = f.business_id),
    'google_url', (select google_review_url from public.businesses where id = f.business_id),
    'first_name', (select split_part(trim(full_name), ' ', 1) from public.customers where id = f.customer_id),
    'answered', f.answered_at is not null,
    'rating', f.rating
  );
end;
$$;

grant execute on function public.feedback_info(text) to anon, authenticated;

-- -------------------------------------------------------------
-- Token ile cevap (bir kez). 1–3 puanda işletmeye bildirim düşer.
-- -------------------------------------------------------------
create or replace function public.submit_feedback(
  p_token text,
  p_rating int,
  p_comment text,
  p_wants_call boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.feedback_requests%rowtype;
  v_name text;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'error', 'rating');
  end if;

  update public.feedback_requests
     set rating      = p_rating,
         comment     = nullif(left(trim(coalesce(p_comment, '')), 1000), ''),
         wants_call  = coalesce(p_wants_call, false),
         answered_at = now()
   where token = p_token
     and answered_at is null
  returning * into f;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'answered');
  end if;

  if p_rating <= 3 then
    select full_name into v_name from public.customers where id = f.customer_id;
    insert into public.notifications (business_id, kind, title, detail, href)
    values (
      f.business_id,
      'review',
      'Memnun olmayan müşteri',
      coalesce(v_name, 'Bir müşteri') || ' · ' || p_rating || ' puan'
        || case when f.wants_call then ' · aranmak istiyor' else '' end,
      '/yorumlar'
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.submit_feedback(text, int, text, boolean) to anon, authenticated;

create or replace function public.feedback_google_click(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.feedback_requests
     set google_clicked_at = coalesce(google_clicked_at, now())
   where token = p_token;
$$;

grant execute on function public.feedback_google_click(text) to anon, authenticated;
