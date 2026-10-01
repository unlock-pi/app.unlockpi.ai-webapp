-- Audit trail for realtime cost estimates.
--
-- Every stored `estimated_cost_usd` is tokens x a rate card. Without recording
-- WHICH rate card produced it, historical numbers can't be verified or
-- recomputed after a price change. `pricing_version` stamps that, e.g.
-- "gpt-realtime-2@2025-08-28", or "...~approx" when the per-modality token
-- breakdown was missing and totals had to be used instead.
--
-- Safe to re-run.

alter table public.ai_realtime_responses
  add column if not exists pricing_version text;

alter table public.ai_realtime_sessions
  add column if not exists pricing_version text;

-- Carry the pricing version up to the session on rollup, alongside the existing
-- token/cost accumulation. The session keeps the most recent response's version;
-- per-response rows remain the fine-grained audit record.
create or replace function public.rollup_realtime_response_usage()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.ai_realtime_sessions
  set response_count = response_count + 1,
      status = case
        when status in ('completed', 'failed') then status
        else 'connected'
      end,
      input_text_tokens = input_text_tokens + new.input_text_tokens,
      input_audio_tokens = input_audio_tokens + new.input_audio_tokens,
      cached_text_tokens = cached_text_tokens + new.cached_text_tokens,
      cached_audio_tokens = cached_audio_tokens + new.cached_audio_tokens,
      output_text_tokens = output_text_tokens + new.output_text_tokens,
      output_audio_tokens = output_audio_tokens + new.output_audio_tokens,
      pricing_version = coalesce(new.pricing_version, pricing_version),
      estimated_cost_usd = case
        when new.estimated_cost_usd is null then estimated_cost_usd
        else coalesce(estimated_cost_usd, 0) + new.estimated_cost_usd
      end
  where id = new.usage_session_id and owner_id = new.owner_id;
  return new;
end;
$$;

drop trigger if exists trg_rollup_realtime_response_usage on public.ai_realtime_responses;
create trigger trg_rollup_realtime_response_usage
after insert on public.ai_realtime_responses
for each row execute procedure public.rollup_realtime_response_usage();
