-- OPTIONAL, discretionary — not required for the app to keep working.
--
-- Every existing ai_realtime_sessions row has response_count = 0 because the
-- RLS bug fixed in 20260803_fix_realtime_responses_rls.sql blocked every
-- response-usage insert since the table was created. There is no real token
-- data to recover for these sessions — it was never captured, so it can't be
-- backfilled honestly.
--
-- This marks them as "we don't know the cost" rather than leaving them
-- looking like legitimate $0.00 sessions, which would silently understate
-- total spend. `estimated_cost_usd` stays null (already the "unknown" value
-- the admin panel's warning banner looks for) — this just stamps a
-- pricing_version so it's clear WHY, on inspection, rather than looking
-- indistinguishable from "not yet processed."
--
-- Run this once. Sessions created after the RLS fix are unaffected — they'll
-- get real response rows and real costs going forward.

update public.ai_realtime_sessions
set pricing_version = 'no-usage-captured'
where response_count = 0
  and estimated_cost_usd is null
  and pricing_version is null;
