-- /visuals feature: stores generated images (UploadThing URLs) and Mermaid diagrams.
-- Run this in the Supabase SQL editor.

create table if not exists public.visuals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('image', 'mermaid')),
  title text,
  prompt text not null,
  style text,
  aspect_ratio text,
  model_tier text,
  -- Populated for kind = 'image'
  image_url text,
  -- Populated for kind = 'mermaid'
  mermaid_code text,
  created_at timestamptz not null default now()
);

create index if not exists visuals_owner_created_idx
  on public.visuals (owner_id, created_at desc);

alter table public.visuals enable row level security;

-- Each user only ever sees and writes their own visuals.
create policy "Users read own visuals"
  on public.visuals for select
  using (auth.uid() = owner_id);

create policy "Users insert own visuals"
  on public.visuals for insert
  with check (auth.uid() = owner_id);

create policy "Users delete own visuals"
  on public.visuals for delete
  using (auth.uid() = owner_id);
