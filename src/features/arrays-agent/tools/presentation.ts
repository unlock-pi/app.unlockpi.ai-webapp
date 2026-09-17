import { tool } from "ai";
import { z } from "zod";

import {
  fail,
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

/**
 * Frame navigation for when the agent is driving a live class.
 *
 * Without these the teacher has to reach for the keyboard between every
 * array — which defeats the point of a voice agent. They are deliberately
 * separate from the array tools: an array operation changes what the board
 * SHOWS, these change WHICH board is showing.
 */
export function createPresentationTools(ctx: ArrayToolContext) {
  const NOT_PRESENTING =
    "There are no frames to move between — this board is not part of a presentation.";

  /** Every navigation tool ends the same way: report the frame now on screen. */
  const move = (describe: () => string | undefined) => {
    if (!ctx.presentation) return fail(ctx, NOT_PRESENTING);
    const now = describe();
    return report(ctx, now ?? NOT_PRESENTING);
  };

  return {
    next_frame: tool({
      description:
        "Move the class to the next frame. Use for 'next', 'next slide', 'move on', 'carry on'.",
      inputSchema: z.object({}),
      execute: async () => move(() => ctx.presentation?.next()),
    }),

    previous_frame: tool({
      description:
        "Move the class back one frame. Use for 'previous', 'go back', 'back a slide'.",
      inputSchema: z.object({}),
      execute: async () => move(() => ctx.presentation?.previous()),
    }),

    go_to_frame: tool({
      description:
        "Jump to a frame by its number. Use for 'go to frame 3', 'slide 5 please'. Frame numbers start at 1. For 'go to the start' or 'go to the end' use first or last instead.",
      inputSchema: z.object({
        frame_number: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("One-based frame number."),
        position: z
          .enum(["first", "last"])
          .optional()
          .describe("Jump to the first or last frame instead of a number."),
      }),
      execute: async ({ frame_number, position }) => {
        if (!ctx.presentation) return fail(ctx, NOT_PRESENTING);
        if (position === "first") return report(ctx, ctx.presentation.first());
        if (position === "last") return report(ctx, ctx.presentation.last());
        if (typeof frame_number !== "number") {
          return fail(ctx, "Say which frame number to go to, or first or last.");
        }
        return report(ctx, ctx.presentation.goTo(frame_number));
      },
    }),

    find_frame: tool({
      description:
        "Find and show the frame that best matches a description. Use for 'show the frame about binary search', 'go to the slide with the diagram'.",
      inputSchema: z.object({
        query: z.string().describe("What the teacher is looking for, in their words."),
      }),
      execute: async ({ query }) => {
        if (!ctx.presentation) return fail(ctx, NOT_PRESENTING);
        return report(ctx, ctx.presentation.find(query));
      },
    }),

    describe_current_frame: tool({
      description:
        "Read what is on the frame currently shown to the class. Call this before answering any question about 'this slide' or 'what's on screen' — never assume from an earlier tool call.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!ctx.presentation) return fail(ctx, NOT_PRESENTING);
        return report(ctx, ctx.presentation.describe());
      },
    }),
  };
}
