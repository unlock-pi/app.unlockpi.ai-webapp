import { tool } from "ai";
import { z } from "zod";

import { MAX_TOTAL, MIN_TOTAL } from "@/features/counting-agent/lib/counting-frames";
import { explainFactorialDivisibility, explainTrailingZeros } from "@/features/counting-agent/lib/counting-ops";
import { commit, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

export function createFactorialAnalysisTools(ctx: CountingToolContext) {
  return {
    explain_trailing_zeros: tool({
      description:
        "Work out how many trailing zeros N! ends in, and SHOW the method rather than just the number — CAT/aptitude-exam style. Use for 'how many trailing zeros in 945 factorial', 'how many zeros does 100! end with'. Walks the board through highlighting multiples of 5, then 25, then 125, and so on (a trailing zero needs a factor of 10 = 2×5, and a factorial always has far more even numbers than multiples of 5, so only the 5s are ever the bottleneck), with a running total that builds up beside the strip and stays there as the final breakdown, e.g. '⌊945/5⌋ + ⌊945/25⌋ + ⌊945/125⌋ + ⌊945/625⌋ = 189+37+7+1 = 234'.",
      inputSchema: z.object({
        n: z.number().int().min(MIN_TOTAL).max(MAX_TOTAL).describe(`N in N factorial, from ${MIN_TOTAL} to ${MAX_TOTAL}.`),
      }),
      execute: async ({ n }) => commit(ctx, explainTrailingZeros(ctx.state.strip, n)),
    }),

    find_highest_power_dividing_factorial: tool({
      description:
        "Find the highest power of a PRIME p that divides N! (Legendre's formula), and optionally check whether a specific power divides it evenly — CAT/aptitude-exam style, e.g. 'does 7 to the power 30 divide 200 factorial', 'what's the highest power of 3 in 50 factorial'. Same highlight-multiples-of-p-then-p²-then-p³ method as explain_trailing_zeros, generalized to any prime. p MUST be prime — for a composite base, break it into its prime factors and call this once per prime, then take the limiting one.",
      inputSchema: z.object({
        n: z.number().int().min(MIN_TOTAL).max(MAX_TOTAL).describe(`N in N factorial, from ${MIN_TOTAL} to ${MAX_TOTAL}.`),
        p: z.number().int().min(2).describe("The prime base, e.g. 7."),
        targetExponent: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("If asking 'does p^k divide N!', pass k here to get a direct yes/no with the shortfall or leftover."),
      }),
      execute: async ({ n, p, targetExponent }) =>
        commit(ctx, explainFactorialDivisibility(ctx.state.strip, n, p, targetExponent)),
    }),
  };
}
