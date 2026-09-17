import { tool } from "ai";
import { z } from "zod";

import { analyzeArray, transformArray } from "@/features/arrays-agent/lib/array-analysis";
import {
  commit,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

/**
 * The read-and-rearrange operations a teacher expects from an array
 * visualiser (the VisuAlgo set), behind two enums rather than a dozen tools.
 *
 * Splitting them by whether they CHANGE the array is the distinction that
 * matters here: `analyze_array` always leaves the board as it found it, so the
 * model can reach for it freely mid-explanation.
 */
export function createAnalysisTools(ctx: ArrayToolContext) {
  const array = () => ctx.state.array;

  return {
    analyze_array: tool({
      description:
        "Measure something about the array WITHOUT changing it, animating the scan. Use for 'what's the largest', 'find the minimum', 'add them all up', 'what's the average', 'is this sorted', 'find the 3rd smallest', 'which two add to 10'.",
      inputSchema: z.object({
        metric: z
          .enum([
            "min",
            "max",
            "sum",
            "average",
            "kth_smallest",
            "kth_largest",
            "two_sum",
            "is_sorted",
          ])
          .describe("What to measure."),
        k: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Which rank, for kth_smallest / kth_largest. 1 means the very smallest."),
        target: z
          .union([z.string(), z.number()])
          .optional()
          .describe("The total two elements must add to, for two_sum."),
      }),
      execute: async ({ metric, k, target }) => {
        ctx.patch({ topic: `array_${metric}` });
        return commit(
          ctx,
          analyzeArray(
            array().values,
            metric,
            { k, target: target === undefined ? undefined : String(target) },
            array().name,
          ),
        );
      },
    }),

    transform_array: tool({
      description:
        "Rearrange the array in place, animating each move. Use for 'reverse it', 'remove the duplicates', 'swap index 1 and 4', 'shuffle it', 'rotate it left by 2'. For putting it in order use the sorting tools instead.",
      inputSchema: z.object({
        operation: z
          .enum(["reverse", "remove_duplicates", "swap", "shuffle", "rotate"])
          .describe("What to do to the array."),
        from: z.number().int().optional().describe("First index, for swap."),
        to: z.number().int().optional().describe("Second index, for swap."),
        by: z
          .number()
          .int()
          .optional()
          .describe("How many places to rotate left. Negative rotates right."),
      }),
      execute: async ({ operation, from, to, by }) => {
        ctx.patch({ topic: `array_${operation}` });
        return commit(
          ctx,
          transformArray(array().values, operation, { from, to, by }, array().name),
        );
      },
    }),
  };
}
