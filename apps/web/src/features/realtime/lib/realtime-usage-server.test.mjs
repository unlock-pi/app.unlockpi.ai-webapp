import { describe, expect, test } from "bun:test";

import {
  estimateSessionFromDuration,
  getRealtimeUsageRecord,
} from "./realtime-usage-server.ts";

describe("estimateSessionFromDuration", () => {
  test("prices a session that produced no responses", () => {
    // 300s x 20 tokens/s = 6000 audio input tokens; 6000/1M x $32 = $0.192
    const estimate = estimateSessionFromDuration(300, "gpt-realtime-2");

    expect(estimate.input_audio_tokens).toBe(6000);
    expect(estimate.estimated_cost_usd).toBeCloseTo(0.192, 10);
    expect(estimate.pricing_version).toContain("~duration-estimate");
  });

  test("returns null for a zero-length session", () => {
    expect(estimateSessionFromDuration(0, "gpt-realtime-2")).toBeNull();
  });

  test("returns null for an unpriced model", () => {
    expect(estimateSessionFromDuration(300, "future-model")).toBeNull();
  });
});

describe("getRealtimeUsageRecord", () => {
  test("estimates gpt-realtime-2 cost from detailed token usage", () => {
    const record = getRealtimeUsageRecord(
      {
        input_token_details: {
          text_tokens: 1_000_000,
          audio_tokens: 1_000_000,
          cached_tokens_details: {
            text_tokens: 100_000,
            audio_tokens: 200_000,
          },
        },
        output_token_details: {
          text_tokens: 500_000,
          audio_tokens: 250_000,
        },
      },
      "gpt-realtime-2",
    );

    expect(record.estimated_cost_usd).toBeCloseTo(57.32, 8);
  });

  test("does not guess a price for an unknown model", () => {
    const record = getRealtimeUsageRecord(
      { output_token_details: { text_tokens: 1_000 } },
      "future-realtime-model",
    );

    expect(record.estimated_cost_usd).toBeNull();
    expect(record.pricing_version).toBeNull();
  });

  test("stamps the rate card version used", () => {
    const record = getRealtimeUsageRecord(
      { output_token_details: { text_tokens: 1_000 } },
      "gpt-realtime-2",
    );

    expect(record.pricing_version).toBe("gpt-realtime-2@2025-08-28");
  });

  test("prices dated model snapshots as their family", () => {
    const record = getRealtimeUsageRecord(
      { output_token_details: { text_tokens: 1_000_000 } },
      "gpt-realtime-2-2025-08-28",
    );

    expect(record.estimated_cost_usd).toBeCloseTo(24, 8);
  });

  test("falls back to totals instead of recording a free session", () => {
    // No per-modality breakdown — previously this stored 0 tokens and $0.00,
    // making a paid session look free.
    const record = getRealtimeUsageRecord(
      { input_tokens: 1_000_000, output_tokens: 1_000_000 },
      "gpt-realtime-2",
    );

    expect(record.estimated_cost_usd).toBeGreaterThan(0);
    expect(record.pricing_version).toContain("~approx");
  });
});
