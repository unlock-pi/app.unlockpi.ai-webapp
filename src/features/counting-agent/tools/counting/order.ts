import { tool } from "ai";
import { z } from "zod";

import { reverseOrder, setOrder } from "@/features/counting-agent/lib/counting-ops";
import { commit, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

export function createOrderTools(ctx: CountingToolContext) {
  return {
    reverse_order: tool({
      description: "Flip the strip's direction. Use for 'reverse it', 'count backwards', 'flip the order'.",
      inputSchema: z.object({}),
      execute: async () => commit(ctx, reverseOrder(ctx.state.strip)),
    }),

    set_order: tool({
      description: "Set the strip's direction explicitly. Use for 'count up' (ascending) or 'count down' (descending).",
      inputSchema: z.object({
        order: z.enum(["ascending", "descending"]).describe("The direction to count in."),
      }),
      execute: async ({ order }) => commit(ctx, setOrder(ctx.state.strip, order)),
    }),
  };
}
