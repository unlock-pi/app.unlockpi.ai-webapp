import { tool } from "ai";
import { z } from "zod";

import { clearDivision, setDivision } from "@/features/counting-agent/lib/counting-ops";
import { commit, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

export function createDivisionTools(ctx: CountingToolContext) {
  return {
    divide_by: tool({
      description:
        "Divide every number on the strip by a divisor. Numbers that divide evenly are struck through on the board; the rest show their remainder above the cell (true n mod divisor — e.g. 15 divided by 5 has remainder 0, so it is struck through, not 3). Use for 'divide by 5', 'show the remainder when divided by 7'.",
      inputSchema: z.object({
        divisor: z.number().int().min(1).describe("Divide every number by this. Must be a positive whole number."),
      }),
      execute: async ({ divisor }) => commit(ctx, setDivision(ctx.state.strip, divisor)),
    }),

    clear_division: tool({
      description: "Clear the active division. Use for 'clear the division', 'stop dividing'.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, clearDivision(ctx.state.strip)),
    }),
  };
}
