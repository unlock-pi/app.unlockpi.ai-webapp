-- ============================================================================
-- REALTIME COST TRACKING — DIAGNOSTIC
-- ============================================================================
-- Not a migration. Run this in the Supabase SQL editor and paste the output.
-- Each section answers one specific "is this link of the chain working?"
-- question, so we stop guessing and find the actual break.
--
-- The chain is:
--   1. session row created        -> ai_realtime_sessions
--   2. response usage inserted    -> ai_realtime_responses   <-- most likely break
--   3. trigger rolls up to session-> ai_realtime_sessions.estimated_cost_usd
-- ============================================================================


-- [1] Do the required columns exist?
-- Expect: pricing_version present on BOTH tables. If missing, migration 01
-- didn't apply and every insert will fail.
select
  '1. COLUMNS' as check,
  table_name,
  column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('ai_realtime_sessions', 'ai_realtime_responses')
  and column_name in ('pricing_version', 'estimated_cost_usd', 'response_count')
order by table_name, column_name;


-- [2] What RLS policies exist on ai_realtime_responses?
-- Expect: an INSERT policy whose qual is just (auth.uid() = owner_id).
-- If you still see an `EXISTS (SELECT ... FROM ai_realtime_sessions ...)`
-- subquery here, migration 03 did NOT apply — that's the bug.
select
  '2. POLICIES' as check,
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename = 'ai_realtime_responses';


-- [3] Is the rollup trigger installed?
-- Expect: exactly one row, trg_rollup_realtime_response_usage.
select
  '3. TRIGGER' as check,
  tgname as trigger_name,
  tgenabled as enabled
from pg_trigger
where tgrelid = 'public.ai_realtime_responses'::regclass
  and not tgisinternal;


-- [4] THE KEY QUESTION: has ANY response row ever been written?
-- Expect after a fresh session: total_responses > 0.
-- If this is still 0 after running a canvas session, the insert is being
-- rejected and section [2] will tell us why.
select
  '4. RESPONSE ROWS' as check,
  count(*) as total_responses,
  count(estimated_cost_usd) as rows_with_cost,
  coalesce(sum(estimated_cost_usd), 0) as total_cost_usd,
  max(created_at) as most_recent
from public.ai_realtime_responses;


-- [5] The 10 most recent sessions — did the rollup reach them?
-- If [4] shows response rows but response_count is 0 here, the TRIGGER is
-- the broken link (not the insert).
select
  '5. RECENT SESSIONS' as check,
  id,
  mode,
  model,
  status,
  duration_seconds,
  response_count,
  input_audio_tokens + input_text_tokens as input_tokens,
  output_audio_tokens + output_text_tokens as output_tokens,
  estimated_cost_usd,
  pricing_version,
  started_at
from public.ai_realtime_sessions
order by started_at desc
limit 10;


-- [6] Sanity check on the rollup: compare per-session response rows against
-- the session's own counter. Any row where they disagree means the trigger
-- fired inconsistently.
select
  '6. ROLLUP MATCH' as check,
  s.id,
  s.response_count as session_says,
  count(r.id) as responses_actually_stored,
  s.estimated_cost_usd as session_cost,
  coalesce(sum(r.estimated_cost_usd), 0) as sum_of_response_costs
from public.ai_realtime_sessions s
left join public.ai_realtime_responses r on r.usage_session_id = s.id
group by s.id, s.response_count, s.estimated_cost_usd
order by s.id
limit 10;
