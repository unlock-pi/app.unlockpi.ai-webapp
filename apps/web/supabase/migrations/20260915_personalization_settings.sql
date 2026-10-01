-- Personalization settings: one row per user, controlling the tone the AI
-- uses when speaking with them (warmth/enthusiasm trait sliders), plus
-- free-text custom instructions and "about you" context.
--
-- Uses owner_id as the primary key rather than a separate id + unique
-- index: this is a 1:1 settings row per user, not a collection, so the app
-- always upserts on owner_id (see personalization-form.tsx).
--
-- Depends on public.set_updated_at_timestamp(), defined in
-- 20260409_teaching_workspace.sql. Safe to re-run.

create table if not exists public.user_personalization (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  about_you text,
  custom_instructions text,
  -- -2..2, default 0 ("Default"/middle). Matches the 5-stop slider in the
  -- UI: Professional/Calm at -2 through Warm/Enthusiastic at +2.
  warmth smallint not null default 0,
  enthusiasm smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_personalization_warmth_range
    check (warmth between -2 and 2),
  constraint user_personalization_enthusiasm_range
    check (enthusiasm between -2 and 2),
  constraint user_personalization_nickname_length
    check (nickname is null or char_length(nickname) <= 50),
  constraint user_personalization_about_you_length
    check (about_you is null or char_length(about_you) <= 1500),
  constraint user_personalization_custom_instructions_length
    check (custom_instructions is null or char_length(custom_instructions) <= 1500)
);

drop trigger if exists trg_user_personalization_updated_at on public.user_personalization;
create trigger trg_user_personalization_updated_at
before update on public.user_personalization
for each row
execute procedure public.set_updated_at_timestamp();

alter table public.user_personalization enable row level security;

drop policy if exists "personalization_select_own" on public.user_personalization;
create policy "personalization_select_own"
  on public.user_personalization
  for select
  using (auth.uid() = owner_id);

drop policy if exists "personalization_insert_own" on public.user_personalization;
create policy "personalization_insert_own"
  on public.user_personalization
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "personalization_update_own" on public.user_personalization;
create policy "personalization_update_own"
  on public.user_personalization
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "personalization_delete_own" on public.user_personalization;
create policy "personalization_delete_own"
  on public.user_personalization
  for delete
  using (auth.uid() = owner_id);
