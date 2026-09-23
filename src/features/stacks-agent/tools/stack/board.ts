import { tool } from "ai";
import { z } from "zod";

import {
  commit,
  fail,
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";
import {
  STACK_COMPLEXITY,
  stackFrame,
  topFrame,
} from "@/features/stacks-agent/lib/stack-frames";

/**
 * The board itself: what is lit, what is explained, and how the stack is
 * drawn.
 *
 * `show_stack_as_array` is the one that earns its place. A stack is an array
 * with one end closed, and a class that has just done arrays believes that
 * far more readily when the same cells they were indexing turn into the
 * bucket — and back.
 */
export function createStackBoardTools(ctx: ArrayToolContext) {
  const stack = () => ctx.state.array;

  return {
    highlight_top: tool({
      description:
        "Put the spotlight on the top of the stack without changing it. Use for 'point at the top', 'show me where the top pointer is', 'which one comes off next'.",
      inputSchema: z.object({}),
      execute: async () => {
        const { values, name } = stack();
        if (values.length === 0) {
          return fail(ctx, `${name} is empty, so there is no top to point at.`);
        }
        const top = values.length - 1;
        ctx.patch({ selectedIndex: top });
        return commit(ctx, {
          values,
          frames: [topFrame(values, `Top of ${name} is ${values[top]}, at index ${top}.`)],
          summary: `The top of ${name} is ${values[top]}. That is the only item push and pop can touch.`,
        });
      },
    }),

    highlight_depth: tool({
      description:
        "Point at an item by how far down it is from the top — 0 is the top, 1 is under it. Use for 'point at the second one down', 'what is under the top'. Say that reaching it for real would mean popping everything above it.",
      inputSchema: z.object({
        depth: z.number().int().min(0).describe("0 = top, 1 = the one under it, and so on."),
      }),
      execute: async ({ depth }) => {
        const { values, name } = stack();
        const index = values.length - 1 - depth;
        if (index < 0) {
          return fail(
            ctx,
            `${name} holds ${values.length} item(s), so there is nothing ${depth} below the top.`,
          );
        }
        ctx.patch({ selectedIndex: index });
        return commit(ctx, {
          values,
          frames: [
            stackFrame(values, `${depth} below the top: ${values[index]}.`, {
              active: [index],
              found: index,
            }),
          ],
          summary: `${values[index]} sits ${depth} below the top of ${name}. Getting to it would mean popping the ${depth} item(s) above it first.`,
        });
      },
    }),

    show_stack_complexity: tool({
      description:
        "Put the cost of a stack operation on the board. Use for 'what is the complexity of push', 'why is pop O(1)', 'how expensive is searching a stack'.",
      inputSchema: z.object({
        operation: z
          .enum([
            "push",
            "pop",
            "peek",
            "is_empty",
            "size",
            "search_stack",
            "traverse_stack",
            "clear_stack",
            "reverse_stack",
            "balanced_parentheses",
            "infix_to_postfix",
            "evaluate_postfix",
          ])
          .describe("Which operation to price."),
      }),
      execute: async ({ operation }) => {
        const complexity = STACK_COMPLEXITY[operation];
        if (!complexity) return fail(ctx, `No complexity recorded for ${operation}.`);
        ctx.overlay({ kind: "complexity", operation: operation.replace(/_/g, " "), complexity });
        return report(
          ctx,
          `${operation.replace(/_/g, " ")} is ${complexity.time} time and ${complexity.space} space. ${complexity.reason}`,
          { complexity },
        );
      },
    }),

    explain_stack_concept: tool({
      description:
        "Put a short written explanation on the board beside the stack. Use for 'explain LIFO', 'what is stack overflow', 'why is it called a stack', 'explain the top pointer', 'when would I use a stack'.",
      inputSchema: z.object({
        title: z.string().min(1).describe("Heading, e.g. 'LIFO'."),
        content: z
          .string()
          .min(1)
          .describe("Two or three sentences in classroom language. Keep it short enough to read from the back."),
      }),
      execute: async ({ title, content }) => {
        ctx.overlay({ kind: "explanation", title, content });
        ctx.patch({ topic: title });
        return report(ctx, `Put "${title}" on the board.`);
      },
    }),

    compare_stack_and_array: tool({
      description:
        "Show the same operation priced on a stack and on an array, side by side. Use for 'how is this different from an array', 'why not just use an array', 'compare stacks and arrays'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.overlay({
          kind: "steps",
          title: "Stack vs array",
          steps: [
            "Array: reach any index in O(1) — A[3] is one calculation.",
            "Stack: reach only the top. Anything deeper means popping what is above it.",
            "Array: inserting in the middle shifts everything after it, O(n).",
            "Stack: push and pop are O(1) because only the end moves.",
            "A stack is an array with one end closed — the restriction is the point, not a missing feature.",
            "It buys you order: the thing you get back is always the most recent one.",
          ],
        });
        return report(
          ctx,
          "Put the stack-versus-array comparison on the board. The short version: a stack gives up random access and gets last-in-first-out order in return.",
        );
      },
    }),

    quiz_class: tool({
      description:
        "Ask the class a stack question and keep the answer hidden until they have tried. Use for 'quiz them', 'ask the class something', 'test them on this'.",
      inputSchema: z.object({
        question: z.string().min(1).describe("The question, e.g. 'After push 4, push 7, pop — what is on top?'"),
        answer: z.string().min(1).describe("The answer, hidden until revealed."),
        choices: z.array(z.string()).optional().describe("Optional multiple-choice options."),
      }),
      execute: async ({ question, answer, choices }) => {
        ctx.overlay({ kind: "quiz", question, answer, choices });
        return report(
          ctx,
          `Asked the class: "${question}". The answer is on the board but hidden — reveal it when they have had a go.`,
        );
      },
    }),

    reset_stack_board: tool({
      description:
        "Clear highlights and the written panels, keeping the stack itself. Use for 'clear the highlights', 'take those notes off', 'tidy up'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.resetCanvas();
        return report(ctx, "Cleared the highlights and panels. The stack is still there.");
      },
    }),

    clear_stack_board: tool({
      description:
        "Remove the stack and everything around it. Use for 'clear the board', 'start fresh', 'take it all off'. Only when the teacher clearly asks.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.clearCanvas();
        return report(ctx, "Cleared the board.");
      },
    }),
  };
}
