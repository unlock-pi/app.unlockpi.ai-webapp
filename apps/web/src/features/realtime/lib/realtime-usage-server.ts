import type { SupabaseClient } from "@supabase/supabase-js";

import type { RealtimeTokenUsage } from "@/features/realtime/types/realtime-usage";
import { getRealtimeTokenRates } from "@/features/realtime/lib/realtime-pricing";
import { sumTokenCost } from "@/lib/token-cost";

type CreateUsageSessionArgs = {
  supabase: SupabaseClient;
  ownerId: string;
  source: "canvas" | "course";
  lessonTitle: string;
  mode: string;
  model: string;
  canvasId?: string | null;
  openaiSessionId?: string | null;
};

type TokenRecord = {
  input_text_tokens: number;
  input_audio_tokens: number;
  cached_text_tokens: number;
  cached_audio_tokens: number;
  output_text_tokens: number;
  output_audio_tokens: number;
};

export async function createRealtimeUsageSession({
  supabase,
  ownerId,
  source,
  lessonTitle,
  mode,
  model,
  canvasId,
  openaiSessionId,
}: CreateUsageSessionArgs) {
  const { data, error } = await supabase
    .from("ai_realtime_sessions")
    .insert({
      owner_id: ownerId,
      source,
      lesson_title: lessonTitle.trim() || "Untitled lesson",
      mode,
      model,
      canvas_id: canvasId || null,
      openai_session_id: openaiSessionId || null,
    })
    .select("id")
    .single();

  if (error) {
    // Returning null here silently disables ALL cost tracking for the session
    // that's about to start, with no other symptom. Log it so the cause is
    // visible instead of surfacing later as "cost is always empty".
    console.error(
      "[realtime usage] Could not create the usage session row — cost tracking is DISABLED for this session:",
      error,
    );
    return null;
  }

  return data.id;
}

/**
 * Assumed audio tokens per second of streamed mic input.
 * ⚠️ Unverified — keep in sync with the same constant in
 * supabase/migrations/20260803_05_backfill_duration_estimate.sql.
 */
export const ASSUMED_AUDIO_TOKENS_PER_SECOND = 20;

/**
 * Safety net for sessions that end with NO recorded responses.
 *
 * OpenAI only reports token usage inside `response.done`. But it bills for
 * audio input the whole time the mic is streaming — so a session where the
 * model never answered (very common in Copilot mode, which is deliberately
 * silent and only responds to act on a tool call) costs real money while
 * reporting zero usage. Without this, those sessions record nothing at all.
 *
 * Returns a duration-based INPUT-audio estimate. Output is left at zero
 * because no response was generated, so nothing was spoken or written.
 */
export function estimateSessionFromDuration(
  durationSeconds: number,
  model: string,
) {
  const resolved = getRealtimeTokenRates(model);
  if (!resolved || durationSeconds <= 0) return null;

  const inputAudioTokens = Math.round(
    durationSeconds * ASSUMED_AUDIO_TOKENS_PER_SECOND,
  );
  const cost = sumTokenCost([
    { tokens: inputAudioTokens, rate: resolved.rates.audioInput },
  ]);

  return {
    input_audio_tokens: inputAudioTokens,
    estimated_cost_usd: cost,
    pricing_version: `${resolved.version}~duration-estimate`,
  };
}

export function getRealtimeUsageRecord(usage: RealtimeTokenUsage, model: string) {
  const input = usage.input_token_details;
  const output = usage.output_token_details;
  let record: TokenRecord = {
    input_text_tokens: positiveInteger(input?.text_tokens),
    input_audio_tokens: positiveInteger(input?.audio_tokens),
    cached_text_tokens: positiveInteger(
      input?.cached_tokens_details?.text_tokens,
    ),
    cached_audio_tokens: positiveInteger(
      input?.cached_tokens_details?.audio_tokens,
    ),
    output_text_tokens: positiveInteger(output?.text_tokens),
    output_audio_tokens: positiveInteger(output?.audio_tokens),
  };

  // Guard against silently recording a $0 session. If OpenAI ever omits (or
  // renames) the per-modality breakdown, every field above lands on 0 and the
  // session looks free even though it cost real money. When that happens but
  // top-level totals exist, keep the tokens and price them at the audio rate —
  // realtime traffic is voice-dominated, so this errs high rather than
  // pretending the session was free. The estimate is flagged `~approx`.
  let approximated = false;
  const detailTotal =
    record.input_text_tokens +
    record.input_audio_tokens +
    record.output_text_tokens +
    record.output_audio_tokens;
  const fallbackInput = positiveInteger(usage.input_tokens);
  const fallbackOutput = positiveInteger(usage.output_tokens);

  if (detailTotal === 0 && fallbackInput + fallbackOutput > 0) {
    approximated = true;
    record = {
      ...record,
      input_audio_tokens: fallbackInput,
      output_audio_tokens: fallbackOutput,
    };
  }

  const priced = estimateCost(record, model);

  return {
    ...record,
    estimated_cost_usd: priced?.cost ?? null,
    pricing_version: priced
      ? approximated
        ? `${priced.version}~approx`
        : priced.version
      : null,
  };
}

function estimateCost(tokens: TokenRecord, model: string) {
  const resolved = getRealtimeTokenRates(model);
  if (!resolved) return null;
  const { rates, version } = resolved;

  const categories = [
    {
      tokens: Math.max(tokens.input_text_tokens - tokens.cached_text_tokens, 0),
      rate: rates.textInput,
    },
    {
      tokens: tokens.cached_text_tokens,
      rate: rates.cachedTextInput,
    },
    {
      tokens: Math.max(tokens.input_audio_tokens - tokens.cached_audio_tokens, 0),
      rate: rates.audioInput,
    },
    {
      tokens: tokens.cached_audio_tokens,
      rate: rates.cachedAudioInput,
    },
    {
      tokens: tokens.output_text_tokens,
      rate: rates.textOutput,
    },
    {
      tokens: tokens.output_audio_tokens,
      rate: rates.audioOutput,
    },
  ];

  return { cost: sumTokenCost(categories), version };
}

function positiveInteger(value: number | undefined) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value ?? 0)) : 0;
}
