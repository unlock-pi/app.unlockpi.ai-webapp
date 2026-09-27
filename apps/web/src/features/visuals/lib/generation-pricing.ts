/**
 * Token pricing for the two models /visuals generation calls:
 *   - gpt-image-1 / gpt-image-1-mini (images) — priced as text-input + image-output tokens
 *   - gpt-4o (mermaid diagrams, via generateObject) — priced as text-input + text-output tokens
 *
 * Both `generateImage()` and `generateObject()` (verified against the installed
 * `@ai-sdk/openai` provider source) return REAL token counts from OpenAI's
 * response — this is genuine usage, not an estimate. What still needs
 * verifying is the $ RATE per token below.
 *
 * ⚠️ RATES BELOW ARE PLACEHOLDERS — paste the pricing tables from
 * https://platform.openai.com/docs/pricing for "gpt-image-1", "gpt-image-1-mini",
 * and "gpt-4o" so these can be confirmed, the same way gpt-realtime-2's rates
 * were verified. Until then, cost_usd for visuals is directional, not
 * billing-accurate — same caveat as before, just now token-driven instead of
 * a flat per-image guess.
 *
 * Same architecture as realtime-pricing.ts: effective-dated rate cards + an
 * env override escape hatch. See that file's header comment for the how-to.
 */

import { sumTokenCost } from "@/lib/token-cost";

export type GenerationTokenRates = {
  /** USD per 1M input/prompt tokens. */
  textInput: number;
  /** USD per 1M output text tokens — set for text models (e.g. gpt-4o). */
  textOutput?: number;
  /** USD per 1M output image tokens — set for image models. */
  imageOutput?: number;
};

type RateCard = { effectiveFrom: string; rates: GenerationTokenRates };

const GENERATION_MODEL_PRICING: Record<string, RateCard[]> = {
  "gpt-image-1-mini": [
    // PLACEHOLDER — verify against platform.openai.com/docs/pricing.
    { effectiveFrom: "2025-01-01", rates: { textInput: 2, imageOutput: 8 } },
  ],
  "gpt-image-1": [
    // PLACEHOLDER — verify against platform.openai.com/docs/pricing.
    { effectiveFrom: "2025-01-01", rates: { textInput: 5, imageOutput: 40 } },
  ],
  "gpt-4o": [
    // PLACEHOLDER — verify against platform.openai.com/docs/pricing.
    { effectiveFrom: "2024-05-13", rates: { textInput: 2.5, textOutput: 10 } },
  ],
};

let cachedOverrides: Record<string, GenerationTokenRates> | null | undefined;

function getOverrides(): Record<string, GenerationTokenRates> | null {
  if (cachedOverrides !== undefined) return cachedOverrides;

  const raw = process.env.GENERATION_PRICING_OVERRIDES;
  if (!raw?.trim()) {
    cachedOverrides = null;
    return null;
  }

  try {
    cachedOverrides = JSON.parse(raw) as Record<string, GenerationTokenRates>;
  } catch (error) {
    console.error(
      "[generation-pricing] GENERATION_PRICING_OVERRIDES is not valid JSON — ignoring it:",
      error,
    );
    cachedOverrides = null;
  }
  return cachedOverrides;
}

function normalize(model: string) {
  return model.trim().toLowerCase();
}

function resolveModelKey(model: string): string | null {
  const normalized = normalize(model);
  if (GENERATION_MODEL_PRICING[normalized]) return normalized;

  const family = Object.keys(GENERATION_MODEL_PRICING).find((name) =>
    normalized.startsWith(`${name}-`),
  );
  return family ?? null;
}

export function getGenerationRates(
  model: string,
  at: Date = new Date(),
): { rates: GenerationTokenRates; version: string } | null {
  const normalized = normalize(model);

  const overrides = getOverrides();
  const override = overrides?.[normalized] ?? overrides?.[model];
  if (override) {
    return { rates: override, version: `${normalized}@env-override` };
  }

  const key = resolveModelKey(model);
  if (!key) return null;

  const cards = GENERATION_MODEL_PRICING[key];
  const asOf = at.toISOString().slice(0, 10);
  const card = [...cards]
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    .filter((entry) => entry.effectiveFrom <= asOf)
    .at(-1);

  if (!card) return null;
  return { rates: card.rates, version: `${key}@${card.effectiveFrom}` };
}

/**
 * Cost for one generation call. Returns null (never 0) when the model has no
 * rate card — callers must treat that as "unknown," not "free."
 */
export function estimateGenerationCost({
  model,
  inputTokens,
  outputTokens,
}: {
  model: string;
  inputTokens: number | undefined;
  outputTokens: number | undefined;
}): { costUsd: number; version: string } | null {
  const resolved = getGenerationRates(model);
  if (!resolved) return null;
  const { rates, version } = resolved;

  const categories = [
    { tokens: inputTokens ?? 0, rate: rates.textInput },
    ...(rates.textOutput
      ? [{ tokens: outputTokens ?? 0, rate: rates.textOutput }]
      : []),
    ...(rates.imageOutput
      ? [{ tokens: outputTokens ?? 0, rate: rates.imageOutput }]
      : []),
  ];

  return { costUsd: sumTokenCost(categories), version };
}
