-- A realtime session may be finished while a keepalive request carrying its
-- final response usage is still in flight. The finish route then writes a
-- duration-based estimate because response_count is temporarily zero. When
-- the real response arrives, it must REPLACE that estimate, not be added to
-- it; otherwise the session is double charged and its token totals are wrong.
--
-- This is especially important for the Array Agent, whose WebRTC connection
-- can close immediately after a tool-only response. Safe to re-run.

create or replace function public.rollup_realtime_response_usage()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.ai_realtime_sessions
  set response_count = case
        when coalesce(pricing_version, '') like '%~duration-estimate' then 1
        else response_count + 1
      end,
      status = case
        when status in ('completed', 'failed') then status
        else 'connected'
      end,
      input_text_tokens = case
        when coalesce(pricing_version, '') like '%~duration-estimate'
          then new.input_text_tokens
        else input_text_tokens + new.input_text_tokens
      end,
      input_audio_tokens = case
        when coalesce(pricing_version, '') like '%~duration-estimate'
          then new.input_audio_tokens
        else input_audio_tokens + new.input_audio_tokens
      end,
      cached_text_tokens = case
        when coalesce(pricing_version, '') like '%~duration-estimate'
          then new.cached_text_tokens
        else cached_text_tokens + new.cached_text_tokens
      end,
      cached_audio_tokens = case
        when coalesce(pricing_version, '') like '%~duration-estimate'
          then new.cached_audio_tokens
        else cached_audio_tokens + new.cached_audio_tokens
      end,
      output_text_tokens = case
        when coalesce(pricing_version, '') like '%~duration-estimate'
          then new.output_text_tokens
        else output_text_tokens + new.output_text_tokens
      end,
      output_audio_tokens = case
        when coalesce(pricing_version, '') like '%~duration-estimate'
          then new.output_audio_tokens
        else output_audio_tokens + new.output_audio_tokens
      end,
      pricing_version = case
        when coalesce(pricing_version, '') like '%~duration-estimate'
          then new.pricing_version
        else coalesce(new.pricing_version, pricing_version)
      end,
      estimated_cost_usd = case
        when coalesce(pricing_version, '') like '%~duration-estimate'
          then new.estimated_cost_usd
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
