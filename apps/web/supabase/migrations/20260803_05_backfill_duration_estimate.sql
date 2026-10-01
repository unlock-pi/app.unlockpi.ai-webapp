-- Backfills estimated_cost_usd for historical gpt-realtime-2 sessions where
-- real usage was never captured (response_count = 0, due to the RLS bug
-- fixed in 20260803_fix_realtime_responses_rls.sql) — using session
-- DURATION as the basis, since that's the one number we do have for every
-- session, tracked from start to finish regardless of the RLS bug.
--
-- ⚠️ ONE UNVERIFIED ASSUMPTION — avg_tokens_per_second below.
-- I could not fetch OpenAI's documented audio-token-per-second conversion
-- (my lookup tool is down right now), so this is a reasoned placeholder, not
-- a confirmed figure. If you find or already know the real rate, change this
-- one line and rerun — every row it touches is stamped
-- '...~duration-estimate' so it's never confused with a real, measured cost.
--
-- What this assumes:
--   - Mic audio (input) runs for close to the full session duration in both
--     modes (Copilot and Co-teacher both keep the mic live).
--   - Spoken audio OUTPUT only happens in Co-teacher ("companion") mode —
--     Copilot ("director") is text-only output, so it gets 0 output tokens
--     here rather than a guessed audio figure for a modality it doesn't use.
--
-- Safe to re-run — it only ever overwrites rows still stamped as untracked.

do $$
declare
  avg_tokens_per_second numeric := 20;  -- ⚠️ ADJUST if you get a verified figure
  audio_input_rate numeric := 32;        -- confirmed: gpt-realtime-2 $/1M tokens
  audio_output_rate numeric := 64;       -- confirmed: gpt-realtime-2 $/1M tokens
begin
  update public.ai_realtime_sessions s
  set
    input_audio_tokens = round(s.duration_seconds * avg_tokens_per_second),
    output_audio_tokens = case
      when s.mode = 'companion' then round(s.duration_seconds * avg_tokens_per_second)
      else 0
    end,
    estimated_cost_usd = (
      (s.duration_seconds * avg_tokens_per_second / 1000000.0) * audio_input_rate
      + case
          when s.mode = 'companion'
            then (s.duration_seconds * avg_tokens_per_second / 1000000.0) * audio_output_rate
          else 0
        end
    ),
    pricing_version = 'gpt-realtime-2@2025-08-28~duration-estimate'
  where s.model = 'gpt-realtime-2'
    and s.response_count = 0
    and s.duration_seconds > 0
    and (s.pricing_version is null or s.pricing_version = 'no-usage-captured');
end $$;
