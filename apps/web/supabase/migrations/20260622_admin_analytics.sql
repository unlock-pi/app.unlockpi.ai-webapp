-- Admin access, daily activity, and auditable OpenAI Realtime usage.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (user_id, display_name, created_at)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
  created_at
from auth.users
on conflict (user_id) do nothing;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name, created_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.created_at
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where user_id = auth.uid()),
    false
  );
$$;

create table if not exists public.user_activity_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default current_date,
  last_seen_at timestamptz not null default now(),
  visit_count integer not null default 1,
  primary key (user_id, activity_date)
);

create or replace function public.touch_user_activity()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.profiles (user_id, last_active_at)
  values (auth.uid(), now())
  on conflict (user_id) do update
    set last_active_at = excluded.last_active_at,
        updated_at = now();

  insert into public.user_activity_daily (user_id, activity_date, last_seen_at)
  values (auth.uid(), current_date, now())
  on conflict (user_id, activity_date) do update
    set last_seen_at = excluded.last_seen_at,
        visit_count = public.user_activity_daily.visit_count + 1;
end;
$$;

create table if not exists public.ai_realtime_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  canvas_id uuid references public.teaching_canvases(id) on delete set null,
  source text not null,
  lesson_title text not null,
  mode text not null,
  model text not null,
  openai_session_id text,
  status text not null default 'created',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  response_count integer not null default 0,
  input_text_tokens bigint not null default 0,
  input_audio_tokens bigint not null default 0,
  cached_text_tokens bigint not null default 0,
  cached_audio_tokens bigint not null default 0,
  output_text_tokens bigint not null default 0,
  output_audio_tokens bigint not null default 0,
  estimated_cost_usd numeric(14, 8),
  created_at timestamptz not null default now(),
  constraint ai_realtime_sessions_source_check
    check (source in ('canvas', 'course')),
  constraint ai_realtime_sessions_status_check
    check (status in ('created', 'connected', 'completed', 'failed'))
);

create index if not exists ai_realtime_sessions_owner_started_idx
  on public.ai_realtime_sessions (owner_id, started_at desc);
create index if not exists ai_realtime_sessions_started_idx
  on public.ai_realtime_sessions (started_at desc);

create table if not exists public.ai_realtime_responses (
  id uuid primary key default gen_random_uuid(),
  usage_session_id uuid not null references public.ai_realtime_sessions(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  response_id text not null,
  input_text_tokens bigint not null default 0,
  input_audio_tokens bigint not null default 0,
  cached_text_tokens bigint not null default 0,
  cached_audio_tokens bigint not null default 0,
  output_text_tokens bigint not null default 0,
  output_audio_tokens bigint not null default 0,
  estimated_cost_usd numeric(14, 8),
  created_at timestamptz not null default now(),
  unique (usage_session_id, response_id)
);

create or replace function public.set_realtime_session_duration()
returns trigger
language plpgsql
as $$
begin
  if new.ended_at is not null then
    new.duration_seconds = greatest(
      0,
      floor(extract(epoch from (new.ended_at - new.started_at)))::integer
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_realtime_session_duration on public.ai_realtime_sessions;
create trigger trg_set_realtime_session_duration
before update of ended_at on public.ai_realtime_sessions
for each row execute procedure public.set_realtime_session_duration();

create or replace function public.rollup_realtime_response_usage()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.ai_realtime_sessions
  set response_count = response_count + 1,
      status = case
        when status in ('completed', 'failed') then status
        else 'connected'
      end,
      input_text_tokens = input_text_tokens + new.input_text_tokens,
      input_audio_tokens = input_audio_tokens + new.input_audio_tokens,
      cached_text_tokens = cached_text_tokens + new.cached_text_tokens,
      cached_audio_tokens = cached_audio_tokens + new.cached_audio_tokens,
      output_text_tokens = output_text_tokens + new.output_text_tokens,
      output_audio_tokens = output_audio_tokens + new.output_audio_tokens,
      estimated_cost_usd = case
        when new.estimated_cost_usd is null then estimated_cost_usd
        else coalesce(estimated_cost_usd, 0) + new.estimated_cost_usd
      end
  where id = new.usage_session_id and owner_id = new.owner_id;
  return new;
end;
$$;

drop trigger if exists trg_rollup_realtime_response_usage on public.ai_realtime_responses;
create trigger trg_rollup_realtime_response_usage
after insert on public.ai_realtime_responses
for each row execute procedure public.rollup_realtime_response_usage();

alter table public.profiles enable row level security;
alter table public.user_activity_daily enable row level security;
alter table public.ai_realtime_sessions enable row level security;
alter table public.ai_realtime_responses enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "realtime_sessions_select_own" on public.ai_realtime_sessions;
create policy "realtime_sessions_select_own" on public.ai_realtime_sessions
  for select using (auth.uid() = owner_id);
drop policy if exists "realtime_sessions_insert_own" on public.ai_realtime_sessions;
create policy "realtime_sessions_insert_own" on public.ai_realtime_sessions
  for insert with check (auth.uid() = owner_id);
drop policy if exists "realtime_sessions_update_own" on public.ai_realtime_sessions;
create policy "realtime_sessions_update_own" on public.ai_realtime_sessions
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "realtime_responses_insert_own" on public.ai_realtime_responses;
create policy "realtime_responses_insert_own" on public.ai_realtime_responses
  for insert with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.ai_realtime_sessions session
      where session.id = usage_session_id and session.owner_id = auth.uid()
    )
  );

revoke all on function public.current_user_is_admin() from public;
revoke all on function public.touch_user_activity() from public;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.touch_user_activity() to authenticated;
