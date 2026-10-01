-- ai_realtime_responses had ONLY an INSERT policy — no SELECT policy at all.
-- With RLS enabled and no SELECT policy, the table is unreadable to any
-- normal (non-service-role) client. The admin panel uses the service-role
-- key so it was unaffected, but this blocks any per-response drill-down and
-- is a latent footgun for upserts that need to see the conflicting row.
--
-- Safe to re-run.

drop policy if exists "realtime_responses_select_own" on public.ai_realtime_responses;
create policy "realtime_responses_select_own" on public.ai_realtime_responses
  for select using (auth.uid() = owner_id);
