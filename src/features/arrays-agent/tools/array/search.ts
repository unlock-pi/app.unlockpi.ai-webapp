import { tool } from "ai";
import { z } from "zod";

import {
  binarySearch,
  findAllOccurrences,
  linearSearch,
} from "@/features/arrays-agent/lib/array-search";
import {
  commit,
  type ArrayToolContext,
} from "@/features/arrays-agent/tools/tool-context";

const targetSchema = z.union([z.string(), z.number()]);

export function createSearchTools(ctx: ArrayToolContext) {
  const array = () => ctx.state.array;

  return {
    linear_search: tool({
      description:
        "Scan left to right comparing every element until the target is found. Use for 'find 30', 'search for 20', 'where is 40'. Works on any array, sorted or not — this is the default search.",
      inputSchema: z.object({
        target: targetSchema.describe("The value to look for."),
      }),
      execute: async ({ target }) => {
        ctx.patch({ topic: "linear_search", algorithm: "linear_search" });
        return commit(ctx, linearSearch(array().values, String(target), array().name));
      },
    }),

    binary_search: tool({
      description:
        "Halve the search range each comparison to find a target fast. Use ONLY when the teacher asks for binary search, and only on a sorted numeric array — the tool refuses on unsorted data and says so.",
      inputSchema: z.object({
        target: targetSchema.describe("The value to look for."),
      }),
      execute: async ({ target }) => {
        ctx.patch({ topic: "binary_search", algorithm: "binary_search" });
        return commit(ctx, binarySearch(array().values, String(target), array().name));
      },
    }),

    find_all_occurrences: tool({
      description:
        "Scan the whole array and report every index holding the target, with no early exit. Use for 'find every 20', 'how many times does 7 appear', 'find all occurrences'.",
      inputSchema: z.object({
        target: targetSchema.describe("The value to count and locate."),
      }),
      execute: async ({ target }) => {
        ctx.patch({ topic: "search_all" });
        return commit(ctx, findAllOccurrences(array().values, String(target), array().name));
      },
    }),
  };
}
