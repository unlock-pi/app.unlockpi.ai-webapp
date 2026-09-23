import { tool } from "ai";
import { z } from "zod";

import {
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";
import { STACKS_AGENT_NAME } from "@/features/stacks-agent/lib/agent-name";

/**
 * The wake-up call.
 *
 * Stacks are the next thing after arrays in every syllabus, and the class
 * should not have to leave the board to get there. This hands over to the
 * stacks tutor inside the same live session: same canvas, same frames, same
 * microphone — a different set of rules and a different voice.
 */
export function createHandoffTools(ctx: ArrayToolContext) {
  return {
    teach_stacks: tool({
      description:
        `Hand the class over to ${STACKS_AGENT_NAME}, the stacks tutor. Use for 'let us do stacks', 'teach stacks now', 'move on to stacks', 'push and pop', 'what is a stack', 'show me a stack'. After this, the board shows a stack and only push, pop and peek are available — which is the point of the lesson.`,
      inputSchema: z.object({
        start_with: z
          .array(z.union([z.string(), z.number()]))
          .optional()
          .describe(
            "Optional values to start the stack with, bottom first. Pass the array currently on the board when the teacher says 'turn this into a stack'.",
          ),
      }),
      execute: async ({ start_with }) => {
        if (!ctx.switchStructure) {
          return report(
            ctx,
            "This board runs the arrays lesson on its own, so there is no stacks tutor to hand over to here. Open the stacks mode from the dock to start one.",
          );
        }
        const seed = start_with?.map((value) => String(value).trim());
        return report(ctx, ctx.switchStructure("stack", seed));
      },
    }),
  };
}
