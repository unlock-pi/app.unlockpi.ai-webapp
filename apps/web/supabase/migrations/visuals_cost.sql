-- Adds cost tracking to the existing `visuals` table for the admin spend panel.
-- Safe to re-run.

alter table public.visuals
  add column if not exists cost_usd numeric;
