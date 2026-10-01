-- Teaching workspace schema for sidebar projects and lesson sessions.
-- Apply with: supabase db push (or run manually in SQL editor).

create extension if not exists pgcrypto;

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.teaching_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_projects_name_not_blank check (char_length(trim(name)) > 0)
);

create unique index if not exists teaching_projects_owner_name_unique
  on public.teaching_projects (owner_id, lower(name));

create index if not exists teaching_projects_owner_updated_idx
  on public.teaching_projects (owner_id, updated_at desc);

create table if not exists public.teaching_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.teaching_projects(id) on delete cascade,
  title text not null,
  topic text not null,
  learning_goals text not null,
  lesson_structure text not null,
  content_outline text,
  status text not null default 'draft',
  is_live boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teaching_sessions_title_not_blank check (char_length(trim(title)) > 0),
  constraint teaching_sessions_topic_not_blank check (char_length(trim(topic)) > 0),
  constraint teaching_sessions_status_check check (status in ('draft', 'ready', 'live', 'archived'))
);

create index if not exists teaching_sessions_owner_created_idx
  on public.teaching_sessions (owner_id, created_at desc);

create index if not exists teaching_sessions_project_created_idx
  on public.teaching_sessions (project_id, created_at desc);

drop trigger if exists trg_teaching_projects_updated_at on public.teaching_projects;
create trigger trg_teaching_projects_updated_at
before update on public.teaching_projects
for each row
execute procedure public.set_updated_at_timestamp();

drop trigger if exists trg_teaching_sessions_updated_at on public.teaching_sessions;
create trigger trg_teaching_sessions_updated_at
before update on public.teaching_sessions
for each row
execute procedure public.set_updated_at_timestamp();

alter table public.teaching_projects enable row level security;
alter table public.teaching_sessions enable row level security;

drop policy if exists "projects_select_own" on public.teaching_projects;
create policy "projects_select_own"
  on public.teaching_projects
  for select
  using (auth.uid() = owner_id);

drop policy if exists "projects_insert_own" on public.teaching_projects;
create policy "projects_insert_own"
  on public.teaching_projects
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "projects_update_own" on public.teaching_projects;
create policy "projects_update_own"
  on public.teaching_projects
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "projects_delete_own" on public.teaching_projects;
create policy "projects_delete_own"
  on public.teaching_projects
  for delete
  using (auth.uid() = owner_id);

drop policy if exists "sessions_select_own" on public.teaching_sessions;
create policy "sessions_select_own"
  on public.teaching_sessions
  for select
  using (auth.uid() = owner_id);

drop policy if exists "sessions_insert_own" on public.teaching_sessions;
create policy "sessions_insert_own"
  on public.teaching_sessions
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "sessions_update_own" on public.teaching_sessions;
create policy "sessions_update_own"
  on public.teaching_sessions
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "sessions_delete_own" on public.teaching_sessions;
create policy "sessions_delete_own"
  on public.teaching_sessions
  for delete
  using (auth.uid() = owner_id);
