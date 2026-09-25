import { tool } from "ai";
import { z } from "zod";

import { MAX_TOTAL, MIN_TOTAL } from "@/features/counting-agent/lib/counting-frames";
import { createFactorialStrip, setCount } from "@/features/counting-agent/lib/counting-ops";
import { commit, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

const orderSchema = z.enum(["ascending", "descending"]).optional();

export function createCreationTools(ctx: CountingToolContext) {
  return {
    set_count: tool({
      description:
        "Show a fresh strip of numbers from 1 to the given total. Use for 'show numbers from 1 to 100', 'count to 50', 'give me a strip of 1000'. Replaces whatever is currently shown — highlights and any division are cleared.",
      inputSchema: z.object({
        total: z
          .number()
          .int()
          .min(MIN_TOTAL)
          .max(MAX_TOTAL)
          .describe(`How high to count, from ${MIN_TOTAL} to ${MAX_TOTAL}.`),
        order: orderSchema.describe("ascending (default) or descending."),
      }),
      execute: async ({ total, order }) => commit(ctx, setCount(ctx.state.strip, total, order)),
    }),

    create_factorial_strip: tool({
      description:
        "Show N factorial as repeated multiplication, e.g. 1×2×3×...×N. Use for 'show the factorial of 6', 'show 100 factorial', 'count down for 100 factorial' (pass order: descending for '100 into 99 into 98...').",
      inputSchema: z.object({
        n: z
          .number()
          .int()
          .min(MIN_TOTAL)
          .max(MAX_TOTAL)
          .describe(`N in N factorial, from ${MIN_TOTAL} to ${MAX_TOTAL}.`),
        order: orderSchema.describe("ascending (1×2×...×N, default) or descending (N×(N-1)×...×1)."),
      }),
      execute: async ({ n, order }) => commit(ctx, createFactorialStrip(ctx.state.strip, n, order)),
    }),
  };
}
