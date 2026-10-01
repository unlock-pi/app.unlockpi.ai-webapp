import { tool } from "ai";
import { z } from "zod";

import {
  traverse2dArray,
  traverseArray,
  traverseArrayReverse,
} from "@/features/arrays-agent/lib/array-ops";
import {
  commit,
  fail,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

export function createTraversalTools(ctx: ArrayToolContext) {
  return {
    traverse_array: tool({
      description:
        "Walk through every element from index 0 to the end, one at a time. Use for 'traverse the array', 'go through it', 'loop over the elements', 'show me how traversal works'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.patch({ topic: "array_traversal" });
        return commit(ctx, traverseArray(ctx.state.array.values, ctx.state.array.name));
      },
    }),

    traverse_array_reverse: tool({
      description:
        "Walk through every element from the last index down to 0. Use for 'traverse backwards', 'go through it in reverse', 'iterate from the end'.",
      inputSchema: z.object({}),
      execute: async () => {
        ctx.patch({ topic: "array_traversal" });
        return commit(ctx, traverseArrayReverse(ctx.state.array.values, ctx.state.array.name));
      },
    }),

    traverse_2d_array: tool({
      description:
        "Walk a 2-D array in row-major order, narrating each cell as [row][column]. Use for 'traverse the grid', 'go through the 2D array', 'show nested loops'. The array must already be a grid — create one with create_multidimensional_array first.",
      inputSchema: z.object({
        rows: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Rows. Defaults to the grid shape already on the board."),
        cols: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Columns. Defaults to the grid shape already on the board."),
      }),
      execute: async ({ rows, cols }) => {
        const { dimensions, values, name } = ctx.state.array;
        const gridRows = rows ?? (dimensions.length === 2 ? dimensions[0] : undefined);
        const gridCols = cols ?? (dimensions.length === 2 ? dimensions[1] : undefined);

        if (!gridRows || !gridCols) {
          return fail(
            ctx,
            "The board is showing a flat array, not a grid. Create one with create_multidimensional_array, or say the rows and columns.",
          );
        }

        ctx.patch({ topic: "multidimensional_traversal", dimensions: [gridRows, gridCols] });
        return commit(ctx, traverse2dArray(values, gridRows, gridCols, name));
      },
    }),
  };
}
