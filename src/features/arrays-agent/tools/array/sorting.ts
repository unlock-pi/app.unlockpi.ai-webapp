import { tool } from "ai";
import { z } from "zod";

import { runSort, type SortAlgorithmName } from "@/features/arrays-agent/lib/array-sorting";
import {
  commit,
  type ArrayToolContext,
  type ArrayToolOutcome,
} from "@/features/arrays-agent/tools/tool-context";

/**
 * One options shape for all five algorithms — the point of the shared
 * `SortTape` interface. A teacher who says "descending" or "step by step"
 * gets the same behaviour whichever sort they named.
 */
const sortOptionsSchema = z.object({
  order: z
    .enum(["ascending", "descending"])
    .default("ascending")
    .describe("Sort direction. Defaults to ascending."),
  animate: z
    .boolean()
    .optional()
    .describe("Play the step-by-step animation on the board. Defaults to true."),
  showSteps: z
    .boolean()
    .optional()
    .describe("Also list the written steps beside the board. Use when asked to show the steps."),
});

type SortInput = z.infer<typeof sortOptionsSchema>;

export function createSortingTools(ctx: ArrayToolContext) {
  const run = (algorithm: SortAlgorithmName, input: SortInput, pivotValue?: number) => {
    ctx.patch({ topic: "sorting", algorithm });
    const result = runSort(
      ctx.state.array.values,
      algorithm,
      {
        order: input.order,
        animate: input.animate ?? true,
        showSteps: input.showSteps ?? false,
        pivotValue,
      },
      ctx.state.array.name,
    );

    const outcome: ArrayToolOutcome = commit(ctx, result);
    if (input.showSteps && Array.isArray(result.meta?.steps)) {
      ctx.overlay({
        kind: "steps",
        title: `${algorithm.replace(/_/g, " ")} — step by step`,
        steps: result.meta.steps as string[],
      });
    }
    return outcome;
  };

  return {
    bubble_sort: tool({
      description:
        "Sort by repeatedly comparing neighbouring pairs and swapping them, so large values bubble to the end. Use for 'bubble sort this', 'sort using bubble sort'. Best for showing why O(n²) is slow.",
      inputSchema: sortOptionsSchema,
      execute: async (input) => run("bubble_sort", input),
    }),

    selection_sort: tool({
      description:
        "Sort by scanning the unsorted tail for its smallest value each pass and swapping it into place. Use for 'selection sort', 'show me selection sort step by step'. Makes the fewest swaps of the quadratic sorts.",
      inputSchema: sortOptionsSchema,
      execute: async (input) => run("selection_sort", input),
    }),

    insertion_sort: tool({
      description:
        "Sort by lifting each element out and sliding it back into the sorted region on its left. Use for 'insertion sort', 'sort it like a hand of cards'. Fast on nearly-sorted data.",
      inputSchema: sortOptionsSchema,
      execute: async (input) => run("insertion_sort", input),
    }),

    merge_sort: tool({
      description:
        "Sort by recursively halving the array and merging the sorted halves back together. Use for 'merge sort', 'use divide and conquer'. O(n log n) but needs extra space for the merge buffer.",
      inputSchema: sortOptionsSchema,
      execute: async (input) => run("merge_sort", input),
    }),

    quick_sort: tool({
      description:
        "Sort by choosing a pivot, partitioning smaller values to its left and larger to its right, then recursing. Use for 'quick sort', 'partition around a pivot', 'use 5 as the pivot'.",
      inputSchema: sortOptionsSchema.extend({
        pivot_value: z
          .number()
          .optional()
          .describe(
            "Value to use as the first pivot when the teacher names one, e.g. 'use 5 as the pivot'. Omit to use the last element.",
          ),
      }),
      execute: async ({ pivot_value, ...input }) => run("quick_sort", input, pivot_value),
    }),
  };
}
