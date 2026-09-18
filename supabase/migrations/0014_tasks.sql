-- =============================================================
-- 0014_tasks.sql
-- Görev Sistemi (Kanban) — kalıcı veri katmanı.
--
-- Şu ana kadar /gorevler sayfası tamamen client-side useState idi:
-- kullanıcı görev ekliyordu, sayfa yenilenince her şey kayboluyordu.
-- Bu migration mevcut arayüzün veri yapısını birebir karşılar.
--
-- Mevcut RLS / business_id / current_business_id() mantığına DOKUNMAZ.
-- Tekrar-güvenli (idempotent). Supabase SQL Editor'da elle çalıştırın.
-- =============================================================

-- =============================================================
-- 1) task_columns — Kanban listeleri (Yapılacaklar / Devam Eden / Tamamlanan)
--    Kullanıcı liste ekleyip adını ve rengini değiştirebiliyor.
-- =============================================================
create table if not exists public.task_columns (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label       text not null,
  -- Tailwind renk sınıfı (UI'daki DOT_PALETTE ile aynı değerler)
  color       text not null default 'bg-primary',
  -- "Tamamlananlar" kolonu: buraya taşınan görev completed_at alır
  is_done     boolean not null default false,
  position    int not null default 0
);

alter table public.task_columns enable row level security;

drop policy if exists "task_columns_all_same_business" on public.task_columns;
create policy "task_columns_all_same_business"
  on public.task_columns for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_task_columns_business
  on public.task_columns(business_id, position);

-- =============================================================
-- 2) tasks — görev kartları
-- =============================================================
create table if not exists public.tasks (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  column_id        uuid not null references public.task_columns(id) on delete cascade,
  -- Kolon içi sıralama (sürükle-bırak kalıcılığı)
  position         int not null default 0,

  emoji            text not null default '📝',
  title            text not null,
  description      text,

  -- Atama: belirli bir personel VEYA "Tüm Ekip"
  assignee_id      uuid references public.staff(id) on delete set null,
  assignee_is_team boolean not null default false,

  due_at           timestamptz,
  priority         text not null default 'normal'
                     check (priority in ('high', 'normal', 'low')),

  -- İlgili müşteri (kart üzerinde durum rozetiyle gösterilir)
  customer_id      uuid references public.customers(id) on delete set null,

  -- Otomasyon tarafından üretilmiş görev (mor şerit + "Otomatik" rozeti)
  is_auto          boolean not null default false,
  -- Dikkat gerektiren görev (çan ikonu)
  has_alert        boolean not null default false,

  completed_at     timestamptz,

  created_by       uuid references public.profiles(id) on delete set null,
  -- Otomasyonun oluşturduğu görevlerde "Otomasyon" yazar
  created_by_label text
);

alter table public.tasks enable row level security;

drop policy if exists "tasks_all_same_business" on public.tasks;
create policy "tasks_all_same_business"
  on public.tasks for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_tasks_board
  on public.tasks(business_id, column_id, position);
create index if not exists idx_tasks_customer
  on public.tasks(customer_id);
create index if not exists idx_tasks_assignee
  on public.tasks(business_id, assignee_id);

-- updated_at otomatik güncellensin
create or replace function public.touch_task_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_task_updated on public.tasks;
create trigger on_task_updated
  before update on public.tasks
  for each row
  execute function public.touch_task_updated_at();

-- =============================================================
-- 3) task_activity — kart geçmişi ("kim ne yaptı")
-- =============================================================
create table if not exists public.task_activity (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  task_id        uuid not null references public.tasks(id) on delete cascade,
  actor_id       uuid references public.profiles(id) on delete set null,
  actor_label    text not null,
  action         text not null
                   check (action in ('created', 'moved', 'updated', 'assigned', 'completed', 'deleted')),
  from_column_id uuid references public.task_columns(id) on delete set null,
  to_column_id   uuid references public.task_columns(id) on delete set null,
  -- Serbest ek bilgi (ör. eski/yeni başlık)
  detail         jsonb not null default '{}'::jsonb
);

alter table public.task_activity enable row level security;

drop policy if exists "task_activity_all_same_business" on public.task_activity;
create policy "task_activity_all_same_business"
  on public.task_activity for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

create index if not exists idx_task_activity_task
  on public.task_activity(task_id, created_at desc);

-- =============================================================
-- 4) Yeni firmalar için varsayılan 3 kolon
--    Halihazırdaki firmalara da (kolonu olmayanlara) eklenir.
-- =============================================================
insert into public.task_columns (business_id, label, color, is_done, position)
select b.id, v.label, v.color, v.is_done, v.position
from public.businesses b
cross join (values
  ('Yapılacaklar',  'bg-amber-400',  false, 0),
  ('Devam Edenler', 'bg-primary',    false, 1),
  ('Tamamlananlar', 'bg-emerald-500', true, 2)
) as v(label, color, is_done, position)
where not exists (
  select 1 from public.task_columns tc where tc.business_id = b.id
);
