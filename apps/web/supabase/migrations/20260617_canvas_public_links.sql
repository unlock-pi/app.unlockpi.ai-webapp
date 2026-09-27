alter table public.teaching_canvases
  add column if not exists topic text,
  add column if not exists share_slug text,
  add column if not exists is_public boolean not null default false;

alter table public.teaching_canvases
  alter column share_slug set default lower(substr(md5(gen_random_uuid()::text), 1, 12));

update public.teaching_canvases
set share_slug = lower(substr(md5(gen_random_uuid()::text), 1, 12))
where share_slug is null;

alter table public.teaching_canvases
  alter column share_slug set not null;

create unique index if not exists teaching_canvases_share_slug_idx
  on public.teaching_canvases (share_slug);

drop policy if exists "canvases_select_own" on public.teaching_canvases;
create policy "canvases_select_own"
  on public.teaching_canvases
  for select
  using (auth.uid() = owner_id or is_public = true);
