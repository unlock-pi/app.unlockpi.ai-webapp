import { tool } from "ai";
import { z } from "zod";

import {
  accessMultidimensionalElement,
  updateMultidimensionalElement,
} from "@/features/arrays-agent/lib/array-ops";
import {
  commit,
  fail,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

export function createMultidimensionalTools(ctx: ArrayToolContext) {
  /**
   * Row/column addressing only means something once the board knows its grid
   * shape, so both tools resolve it the same way and refuse the same way.
   */
  const grid = () => {
    const { dimensions } = ctx.state.array;
    return dimensions.length === 2 ? { rows: dimensions[0], cols: dimensions[1] } : null;
  };

  const noGrid = () =>
    fail(
      ctx,
      "The board is showing a flat array, so [row][column] has no meaning yet. Create a grid first with create_multidimensional_array.",
    );

  return {
    access_multidimensional_element: tool({
      description:
        "Read one cell of a 2-D array by row and column, showing how [row][column] maps to a flat index. Use for 'what is at row 1 column 2', 'show me A of 1 of 0'.",
      inputSchema: z.object({
        row: z.number().int().min(0).describe("Zero-based row."),
        col: z.number().int().min(0).describe("Zero-based column."),
      }),
      execute: async ({ row, col }) => {
        const shape = grid();
        if (!shape) return noGrid();

        const { values, name } = ctx.state.array;
        ctx.patch({ selectedIndex: row * shape.cols + col, topic: "multidimensional_access" });
        return commit(
          ctx,
          accessMultidimensionalElement(values, row, col, shape.cols, name),
        );
      },
    }),

    update_multidimensional_element: tool({
      description:
        "Overwrite one cell of a 2-D array by row and column, in place. Use for 'set row 0 column 1 to 9', 'change the middle cell of the grid'.",
      inputSchema: z.object({
        row: z.number().int().min(0).describe("Zero-based row."),
        col: z.number().int().min(0).describe("Zero-based column."),
        value: z.union([z.string(), z.number()]).describe("The new value."),
      }),
      execute: async ({ row, col, value }) => {
        const shape = grid();
        if (!shape) return noGrid();

        const { values, name } = ctx.state.array;
        ctx.patch({ topic: "multidimensional_access" });
        return commit(
          ctx,
          updateMultidimensionalElement(values, row, col, shape.cols, String(value), name),
        );
      },
    }),
  };
}
