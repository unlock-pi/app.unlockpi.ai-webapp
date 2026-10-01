alter table public.teaching_canvases
  alter column share_slug set default lower(substr(md5(gen_random_uuid()::text), 1, 12));
