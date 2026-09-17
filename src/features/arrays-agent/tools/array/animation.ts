import { tool } from "ai";
import { z } from "zod";

import {
  fail,
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

const speedSchema = z
  .enum(["instant", "normal", "slow"])
  .describe(
    "slow = one readable beat at a time, for following a sort or search; normal = the whole operation in a few seconds; instant = jump straight to the result.",
  );

/**
 * Pacing, as something the teacher controls by voice.
 *
 * A sort's animation is the explanation, so how fast it runs is a teaching
 * decision, not a constant. `replay_last_operation` matters most: "that was
 * too fast" should show the SAME thing again rather than re-running the
 * operation, which would sort an already-sorted array and prove nothing.
 */
export function createAnimationTools(ctx: ArrayToolContext) {
  return {
    set_animation_speed: tool({
      description:
        "Set how fast operations animate from now on. Use for 'slow down', 'go slower', 'too fast', 'step through it', 'speed up', 'just show me the result', 'skip the animation'. Set it BEFORE the operation when the teacher asks to watch something carefully.",
      inputSchema: z.object({ speed: speedSchema }),
      execute: async ({ speed }) => {
        ctx.patch({ speed });
        const message =
          speed === "slow"
            ? "Slow mode: each step now holds long enough to read. Talk through the steps as they play."
            : speed === "instant"
              ? "Instant mode: operations jump straight to the result, with no animation."
              : "Normal speed: the whole operation plays out over a few seconds.";
        return report(ctx, message);
      },
    }),

    replay_last_operation: tool({
      description:
        "Play the LAST operation's animation again without changing the array. Use for 'show me that again', 'that was too fast', 'replay it slowly', 'run it again step by step'. Prefer this over re-running the operation — re-running a sort on an already-sorted array shows nothing.",
      inputSchema: z.object({
        speed: speedSchema.optional().describe("Speed for this replay. Omit to keep the current speed."),
      }),
      execute: async ({ speed }) => {
        const outcome = ctx.replayLast(speed);
        if (!outcome.ok) {
          return fail(
            ctx,
            "Nothing has been animated yet, so there is nothing to replay. Run an operation first.",
          );
        }
        return report(
          ctx,
          `${outcome.message} Narrate the steps as they play, and do not call another tool until you have finished explaining.`,
        );
      },
    }),
  };
}
