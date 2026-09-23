import { tool } from "ai";
import { z } from "zod";

import {
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";
import { STACKS_AGENT_NAME } from "@/features/stacks-agent/lib/agent-name";

/**
 * How the stack is drawn, and who is teaching.
 *
 * Two different things the teacher may ask for, and they are worth keeping
 * apart:
 *
 *   "show the stack as an array"  — still a stack, still push and pop only,
 *                                   drawn on the array strip so the class can
 *                                   see the cells underneath it.
 *   "go back to arrays"           — a different lesson, a different tutor,
 *                                   all the array operations available again.
 */
export function createStackViewTools(ctx: ArrayToolContext) {
  const stack = () => ctx.state.array;

  return {
    show_stack_as_array: tool({
      description:
        "Draw the stack on the array strip instead of in its bucket, keeping stack rules. Use for 'show it as an array', 'how is this stored underneath', 'show me the array behind the stack', 'draw it flat'. Push still adds at the end and pop still removes from the end — the picture changes, the rules do not. This is NOT a switch back to the arrays lesson.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        if (ctx.state.stackView === "array") {
          return report(ctx, `${name} is already drawn as an array.`);
        }
        // Take the bucket away first: two pictures of one stack can drift
        // apart, and the teacher asked to see it drawn the other way, not twice.
        ctx.blocks?.remove("stack");
        ctx.patch({ stackView: "array" });
        ctx.ensureArray(values, name);
        return report(
          ctx,
          `Drawing ${name} as an array strip. Same cells, same rules: index ${Math.max(values.length - 1, 0)} is the top, push writes at the end and pop takes from the end. Everything in the middle is still off limits.`,
        );
      },
    }),

    show_stack_as_bucket: tool({
      description:
        "Go back to drawing the stack in its own bucket, with the top at the open end. Use for 'show it as a stack again', 'back to the stack picture', 'draw it properly'.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        if (ctx.state.stackView === "bucket") {
          return report(ctx, `${name} is already drawn as a stack.`);
        }
        ctx.blocks?.remove("array");
        ctx.patch({ stackView: "bucket" });
        ctx.ensureArray(values, name);
        return report(
          ctx,
          `Back to the bucket. ${name} grows upwards and only the open top is reachable.`,
        );
      },
    }),

    teach_arrays: tool({
      description:
        "Hand the class back to the arrays tutor. Use ONLY when the teacher wants to leave stacks and work on arrays themselves — 'let us go back to arrays', 'teach arrays now', 'I want to sort something', 'insert at index 2'. Not for 'show the stack as an array', which is show_stack_as_array and stays in this lesson.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!ctx.switchStructure) {
          return report(
            ctx,
            `This board runs the stacks lesson on its own, so I cannot hand over here. ${STACKS_AGENT_NAME} can keep going with stacks.`,
          );
        }
        return report(ctx, ctx.switchStructure("array"));
      },
    }),
  };
}
