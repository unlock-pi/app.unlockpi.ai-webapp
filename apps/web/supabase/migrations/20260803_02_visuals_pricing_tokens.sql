-- Token-based cost tracking for /visuals generations.
--
-- Previously `visuals.cost_usd` was a flat guess per tier (e.g. $0.02/image),
-- not measured. It's now computed from real token counts returned by OpenAI
-- (see src/features/visuals/lib/generation-pricing.ts), so we store the
-- tokens and the rate-card version alongside the cost for auditability —
-- same pattern as ai_realtime_responses.pricing_version.
--
-- Safe to re-run. Existing rows keep their old flat-estimate cost_usd; only
-- new generations get real token-based costs.

alter table public.visuals
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists pricing_version text;
