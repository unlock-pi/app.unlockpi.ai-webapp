/**
 * Realtime session pricing.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * OpenAI's Realtime API does NOT tell us what a session cost. The `response.done`
 * event carries a `usage` object with token COUNTS only (text/audio/cached,
 * input/output) — there is no dollar figure anywhere in the realtime stream.
 * OpenAI's org-level billing shows spend, but it is delayed and cannot be
 * attributed to a specific classroom session or tutor.
 *
 * So per-session cost must be: tokens x our own published rates.
 * That makes this file the single source of truth for unit economics.
 *
 * ---------------------------------------------------------------------------
 * HOW TO UPDATE PRICES (two options)
 * ---------------------------------------------------------------------------
 * 1. PERMANENT (preferred) — add a new rate card to MODEL_PRICING below with the
 *    date the new price took effect. Never edit an old card: past sessions were
 *    priced with it, and keeping it makes historical numbers reproducible.
 *
 *       "gpt-realtime-2": [
 *         { effectiveFrom: "2025-08-28", rates: { ...old prices... } },
 *         { effectiveFrom: "2026-03-01", rates: { ...new prices... } },  // <- add
 *       ]
 *
 * 2. URGENT / NO-DEPLOY — set the REALTIME_PRICING_OVERRIDES env var. Use this
 *    when OpenAI ships a new model or changes a price and you cannot wait for a
 *    deploy. It takes precedence over the table above:
 *
 *       REALTIME_PRICING_OVERRIDES='{"gpt-realtime-3":{"textInput":4,"textOutput":24,
 *         "audioInput":32,"audioOutput":64,"cachedTextInput":0.4,"cachedAudioInput":0.4}}'
 *
 *    Move overrides into MODEL_PRICING once you deploy, so pricing stays auditable.
 *
 * All rates are USD per 1,000,000 tokens.
 */

export type RealtimeTokenRates = {
  audioInput: number;
  audioOutput: number;
  cachedAudioInput: number;
  cachedTextInput: number;
  textInput: number;
  textOutput: number;
};

type RateCard = {
  /** ISO date (YYYY-MM-DD) this pricing took effect. */
  effectiveFrom: string;
  rates: RealtimeTokenRates;
};

export type ResolvedRates = {
  rates: RealtimeTokenRates;
  /**
   * Stamped onto every stored cost so any number can be traced back to the
   * exact rate card that produced it, e.g. "gpt-realtime-2@2025-08-28".
   */
  version: string;
};

/**
 * Rate cards per model, oldest first. Add new cards; don't edit old ones.
 */
const MODEL_PRICING: Record<string, RateCard[]> = {
  "gpt-realtime-2": [
    {
      effectiveFrom: "2025-08-28",
      rates: {
        audioInput: 32,
        audioOutput: 64,
        cachedAudioInput: 0.4,
        cachedTextInput: 0.4,
        textInput: 4,
        textOutput: 24,
      },
    },
  ],
};

/**
 * Maps model ids that should be priced as another model — e.g. dated snapshots
 * or renames. Keeps a model rename from silently zeroing out cost tracking.
 */
const MODEL_ALIASES: Record<string, string> = {
  "gpt-realtime": "gpt-realtime-2",
};

let cachedOverrides: Record<string, RealtimeTokenRates> | null | undefined;

/** Parse REALTIME_PRICING_OVERRIDES once. Invalid JSON is ignored loudly. */
function getOverrides(): Record<string, RealtimeTokenRates> | null {
  if (cachedOverrides !== undefined) return cachedOverrides;

  const raw = process.env.REALTIME_PRICING_OVERRIDES;
  if (!raw?.trim()) {
    cachedOverrides = null;
    return null;
  }

  try {
    cachedOverrides = JSON.parse(raw) as Record<string, RealtimeTokenRates>;
  } catch (error) {
    console.error(
      "[realtime-pricing] REALTIME_PRICING_OVERRIDES is not valid JSON — ignoring it:",
      error,
    );
    cachedOverrides = null;
  }
  return cachedOverrides;
}

function normalize(model: string) {
  return model.trim().toLowerCase();
}

/** Find the pricing key for a model id, following aliases and dated suffixes. */
function resolveModelKey(model: string): string | null {
  const normalized = normalize(model);
  if (MODEL_PRICING[normalized]) return normalized;

  const alias = MODEL_ALIASES[normalized];
  if (alias && MODEL_PRICING[alias]) return alias;

  // Dated snapshots like "gpt-realtime-2-2025-08-28" price as their family.
  const family = Object.keys(MODEL_PRICING).find((name) =>
    normalized.startsWith(`${name}-`),
  );
  if (family) return family;

  const aliasFamily = Object.keys(MODEL_ALIASES).find((name) =>
    normalized.startsWith(`${name}-`),
  );
  if (aliasFamily) {
    const target = MODEL_ALIASES[aliasFamily];
    if (MODEL_PRICING[target]) return target;
  }

  return null;
}

/**
 * Resolve the rates that applied to `model` at a given time (defaults to now).
 * Returns null when we have no price — callers MUST treat that as "unknown",
 * never as zero, so an unpriced model can't masquerade as a free session.
 */
export function getRealtimeTokenRates(
  model: string,
  at: Date = new Date(),
): ResolvedRates | null {
  const normalized = normalize(model);

  // 1. Env overrides win — the no-deploy escape hatch.
  const overrides = getOverrides();
  const override = overrides?.[normalized] ?? overrides?.[model];
  if (override) {
    return { rates: override, version: `${normalized}@env-override` };
  }

  // 2. Fall back to the versioned table.
  const key = resolveModelKey(model);
  if (!key) return null;

  const cards = MODEL_PRICING[key];
  const asOf = at.toISOString().slice(0, 10);
  // Newest card whose effective date has already passed.
  const card = [...cards]
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    .filter((entry) => entry.effectiveFrom <= asOf)
    .at(-1);

  if (!card) return null;
  return { rates: card.rates, version: `${key}@${card.effectiveFrom}` };
}

/** Model ids we can price — used by the admin panel to flag gaps. */
export function listPricedModels(): string[] {
  const overrides = getOverrides();
  return [
    ...new Set([
      ...Object.keys(MODEL_PRICING),
      ...Object.keys(MODEL_ALIASES),
      ...Object.keys(overrides ?? {}),
    ]),
  ].sort();
}

/** True when we can attribute a dollar cost to this model. */
export function isModelPriced(model: string): boolean {
  return getRealtimeTokenRates(model) !== null;
}
