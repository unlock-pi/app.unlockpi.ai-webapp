import { tool } from "ai";
import { z } from "zod";

import { clearAccumulator, traverseStrip } from "@/features/counting-agent/lib/counting-ops";
import { commit, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

export function createTraversalTools(ctx: CountingToolContext) {
  return {
    traverse_strip: tool({
      description:
        "Walk the strip step by step, spotlighting one number at a time so the class watches it visit every value in order — this is what makes counting VISIBLE rather than just a jump to a final state. Use for 'traverse it', 'go through every number', 'walk me through it'. ALSO use this straight after highlight_multiples for any 'highlight multiples of X' request: call highlight_multiples first (lights every match at once, static), then call this with subset: 'highlighted' (a quick animated pass over just those matches) — highlight then traverse, so the class sees both the static answer and it being confirmed. Pass accumulate: 'product' to build a running product beside the strip (e.g. for 'multiply all of these together', or use create_factorial_strip for N factorial specifically, which already does this). Pass accumulate: 'sum' to add them up, or 'list' to visibly collect the matches, e.g. for 'collect all the multiples of 5'. The accumulator STAYS on screen after the traversal ends — clear_result removes it.",
      inputSchema: z.object({
        subset: z
          .enum(["all", "highlighted"])
          .default("all")
          .describe(
            "'all' visits every number 1..total. 'highlighted' visits only numbers matching the strip's current highlight rules — use this after highlight_multiples.",
          ),
        accumulate: z
          .enum(["none", "product", "sum", "list"])
          .default("none")
          .describe(
            "'none' just spotlights each number. 'product'/'sum' build a running total beside the strip. 'list' visibly collects the visited numbers.",
          ),
        label: z
          .string()
          .optional()
          .describe("Caption for the result panel, e.g. 'Sum of multiples of 5 ='. Defaults to a generic label."),
      }),
      execute: async ({ subset, accumulate, label }) =>
        commit(ctx, traverseStrip(ctx.state.strip, subset, accumulate, label)),
    }),

    clear_result: tool({
      description:
        "Dismiss the running-result panel beside the strip (the product, sum, or collected list left over from a previous traverse_strip or create_factorial_strip call). Use for 'clear that result', 'take that away', 'hide the product'.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, clearAccumulator(ctx.state.strip)),
    }),
  };
}
