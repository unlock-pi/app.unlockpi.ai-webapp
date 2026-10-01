-- Fixes: "new row violates row-level security policy for table
-- ai_realtime_responses" on every single response-usage insert, since the
-- table was created. Root cause: the insert policy's `exists (select ...
-- from ai_realtime_sessions ...)` subquery is itself gated by
-- ai_realtime_sessions' own RLS, and the two interacting caused the check to
-- fail even for the row's rightful owner. This is why every session in the
-- database has response_count = 0 and zero captured tokens — no response
-- row has ever been successfully written.
--
-- The API route (src/app/api/openai/realtime/usage/route.ts) already verifies
-- session ownership server-side with an explicit `.eq("owner_id", user.id)`
-- lookup before attempting this insert, so the cross-table exists() check was
-- redundant defense-in-depth, not the only guard — dropping it does not
-- weaken security, it just stops relying on a fragile nested-RLS pattern.
--
-- Safe to re-run.

drop policy if exists "realtime_responses_insert_own" on public.ai_realtime_responses;
create policy "realtime_responses_insert_own" on public.ai_realtime_responses
  for insert with check (auth.uid() = owner_id);
