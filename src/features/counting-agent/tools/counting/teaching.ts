import { tool } from "ai";
import { z } from "zod";

import { fail, report, type CountingToolContext } from "@/features/counting-agent/tools/tool-context";

const speedSchema = z
  .enum(["instant", "normal", "slow"])
  .describe(
    "slow = one readable beat at a time; normal = the whole change in a few seconds; instant = jump straight to the result.",
  );

export function createTeachingTools(ctx: CountingToolContext) {
  return {
    quiz_student: tool({
      description:
        "Put a question to the class about the strip currently on the board, holding the answer back until asked. Use for 'give me a question for the students', 'quiz them on this'.",
      inputSchema: z.object({
        question: z.string().describe("The question, about what is on the board right now."),
        answer: z.string().describe("The expected answer, revealed only when the teacher asks."),
        choices: z.array(z.string()).optional().describe("Optional multiple-choice options including the correct one."),
      }),
      execute: async ({ question, answer, choices }) => {
        ctx.overlay({ kind: "quiz", question, answer, choices });
        return report(
          ctx,
          `Asked the class: "${question}". The answer is on the board but hidden — reveal it when they have had a go.`,
        );
      },
    }),

    show_explanation: tool({
      description:
        "Leave a written note in the side panel that STAYS after you move on. Use when the teacher asks you to write something down or keep it up, e.g. explaining why multiples of 10 are highlighted twice.",
      inputSchema: z.object({
        title: z.string().describe("Short heading, e.g. 'Why is 10 highlighted differently?'"),
        content: z.string().describe("Two or three sentences in plain classroom language."),
      }),
      execute: async ({ title, content }) => {
        ctx.overlay({ kind: "explanation", title, content });
        return report(ctx, `Showing the explanation "${title}" beside the strip.`);
      },
    }),

    set_animation_speed: tool({
      description:
        "Set how fast changes animate from now on. Use for 'slow down', 'step through it', 'speed up', 'just show me the result'.",
      inputSchema: z.object({ speed: speedSchema }),
      execute: async ({ speed }) => {
        ctx.patch({ speed });
        const message =
          speed === "slow"
            ? "Slow mode: each change now holds long enough to read."
            : speed === "instant"
              ? "Instant mode: changes jump straight to the result."
              : "Normal speed: changes play out over a couple of seconds.";
        return report(ctx, message);
      },
    }),

    replay_last_operation: tool({
      description:
        "Play the LAST change again without changing the strip. Use for 'show me that again', 'that was too fast'.",
      inputSchema: z.object({
        speed: speedSchema.optional().describe("Speed for this replay. Omit to keep the current speed."),
      }),
      execute: async ({ speed }) => {
        const outcome = ctx.replayLast(speed);
        if (!outcome.ok) {
          return fail(ctx, "Nothing has been animated yet, so there is nothing to replay. Run a change first.");
        }
        return report(ctx, outcome.message);
      },
    }),
  };
}
