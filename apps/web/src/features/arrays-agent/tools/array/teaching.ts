import { tool } from "ai";
import { z } from "zod";

import { COMPLEXITY } from "@/features/arrays-agent/lib/array-frames";
import {
  compareAlgorithms,
  runSort,
  type SortAlgorithmName,
} from "@/features/arrays-agent/lib/array-sorting";
import {
  fail,
  report,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

const algorithmNames = [
  "bubble_sort",
  "selection_sort",
  "insertion_sort",
  "merge_sort",
  "quick_sort",
] as const;

export function createTeachingTools(ctx: ArrayToolContext) {
  return {
    explain_operation: tool({
      description:
        "Explain an array operation in classroom language and put it on the board, including its cost. Use for 'why did the elements shift', 'explain insertion', 'what does traversal actually do'.",
      inputSchema: z.object({
        operation: z
          .enum(Object.keys(COMPLEXITY) as [string, ...string[]])
          .describe("The operation being explained."),
        content: z
          .string()
          .describe("Your explanation, two or three sentences, pitched at the class."),
      }),
      execute: async ({ operation, content }) => {
        const complexity = COMPLEXITY[operation];
        const title = operation.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
        ctx.overlay({ kind: "explanation", title, content });
        if (complexity) ctx.overlay({ kind: "complexity", operation, complexity });
        ctx.patch({ topic: operation });
        return report(ctx, `Explained ${title} on the board.`, { complexity });
      },
    }),

    show_algorithm_steps: tool({
      description:
        "List the written steps an algorithm takes on the current array, without animating it. Use for 'walk me through the steps', 'write out what bubble sort does here'.",
      inputSchema: z.object({
        algorithm: z.enum(algorithmNames).describe("Which algorithm to trace."),
        order: z.enum(["ascending", "descending"]).default("ascending"),
      }),
      execute: async ({ algorithm, order }) => {
        const result = runSort(
          ctx.state.array.values,
          algorithm as SortAlgorithmName,
          { order, animate: false, showSteps: true },
          ctx.state.array.name,
        );
        if (result.rejected) return fail(ctx, result.summary);

        const steps = (result.meta?.steps as string[] | undefined) ?? [];
        ctx.overlay({
          kind: "steps",
          title: `${algorithm.replace(/_/g, " ")} — ${steps.length} steps`,
          steps,
        });
        ctx.patch({ topic: "sorting", algorithm });
        return report(
          ctx,
          `${algorithm.replace(/_/g, " ")} takes ${steps.length} steps on this array: ${result.meta?.comparisons} comparisons and ${result.meta?.swaps} moves. The steps are on the board — the array itself is unchanged.`,
          { complexity: result.complexity, meta: result.meta },
        );
      },
    }),

    compare_algorithms: tool({
      description:
        "Run two or more sorting algorithms on the SAME array and show their comparison and swap counts side by side. Use for 'compare bubble sort and merge sort', 'which is faster on this data'. The array is not changed.",
      inputSchema: z.object({
        algorithms: z
          .array(z.enum(algorithmNames))
          .min(2)
          .describe("Two or more algorithms to measure against each other."),
        order: z.enum(["ascending", "descending"]).default("ascending"),
      }),
      execute: async ({ algorithms, order }) => {
        const rows = compareAlgorithms(ctx.state.array.values, [...algorithms], order);
        if (!rows) {
          return fail(ctx, "Comparing sorts needs a numeric array — this one has non-numeric values.");
        }

        ctx.overlay({
          kind: "comparison",
          title: `On ${ctx.state.array.name} (${ctx.state.array.values.length} elements)`,
          rows,
        });
        ctx.patch({ topic: "algorithm_comparison" });

        const cheapest = rows.reduce((best, row) =>
          row.comparisons + row.swaps < best.comparisons + best.swaps ? row : best,
        );
        return report(
          ctx,
          `On this data ${cheapest.algorithm.replace(/_/g, " ")} did the least work — ${cheapest.comparisons} comparisons and ${cheapest.swaps} moves. Full table is on the board.`,
          { meta: { rows } },
        );
      },
    }),

    quiz_student: tool({
      description:
        "Put a question to the class about the array currently on the board, holding the answer back until asked. Use for 'give me a question for the students', 'quiz them on this', 'check if they followed'.",
      inputSchema: z.object({
        question: z.string().describe("The question, about what is on the board right now."),
        answer: z.string().describe("The expected answer, revealed only when the teacher asks."),
        choices: z
          .array(z.string())
          .optional()
          .describe("Optional multiple-choice options including the correct one."),
      }),
      execute: async ({ question, answer, choices }) => {
        ctx.overlay({ kind: "quiz", question, answer, choices });
        return report(
          ctx,
          `Asked the class: "${question}". The answer is on the board but hidden — reveal it when they have had a go.`,
        );
      },
    }),
  };
}
