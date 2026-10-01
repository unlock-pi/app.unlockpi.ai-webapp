-- Teaching canvases are reusable interactive lesson artifacts.
-- Apply with: supabase db push (or run manually in SQL editor).

create table if not exists public.teaching_canvases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.teaching_projects(id) on delete set null,
  title text not null,
  subject text not null default 'computer_science',
  template_key text,
  document jsonb not null default '{"root": {}, "content": []}'::jsonb,
  active_frame_id text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_canvases_title_not_blank check (char_length(trim(title)) > 0),
  constraint teaching_canvases_subject_not_blank check (char_length(trim(subject)) > 0),
  constraint teaching_canvases_status_check check (status in ('draft', 'ready', 'presenting', 'archived'))
);

create index if not exists teaching_canvases_owner_updated_idx
  on public.teaching_canvases (owner_id, updated_at desc);

create index if not exists teaching_canvases_project_updated_idx
  on public.teaching_canvases (project_id, updated_at desc);

drop trigger if exists trg_teaching_canvases_updated_at on public.teaching_canvases;
create trigger trg_teaching_canvases_updated_at
before update on public.teaching_canvases
for each row
execute procedure public.set_updated_at_timestamp();

alter table public.teaching_canvases enable row level security;

drop policy if exists "canvases_select_own" on public.teaching_canvases;
create policy "canvases_select_own"
  on public.teaching_canvases
  for select
  using (auth.uid() = owner_id);

drop policy if exists "canvases_insert_own" on public.teaching_canvases;
create policy "canvases_insert_own"
  on public.teaching_canvases
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "canvases_update_own" on public.teaching_canvases;
create policy "canvases_update_own"
  on public.teaching_canvases
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "canvases_delete_own" on public.teaching_canvases;
create policy "canvases_delete_own"
  on public.teaching_canvases
  for delete
  using (auth.uid() = owner_id);
