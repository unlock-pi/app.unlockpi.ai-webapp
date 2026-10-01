alter table public.teaching_canvases
  alter column owner_id set default auth.uid();
