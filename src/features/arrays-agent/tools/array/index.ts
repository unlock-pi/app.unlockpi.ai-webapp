import type { ArrayToolContext } from "@/features/arrays-agent/tools/tool-context";
import { createAccessTools } from "@/features/arrays-agent/tools/array/access";
import { createAnalysisTools } from "@/features/arrays-agent/tools/array/analysis";
import { createAnimationTools } from "@/features/arrays-agent/tools/array/animation";
import { createCanvasTools } from "@/features/arrays-agent/tools/array/canvas";
import { createCreationTools } from "@/features/arrays-agent/tools/array/creation";
import { createDeletionTools } from "@/features/arrays-agent/tools/array/deletion";
import { createInsertionTools } from "@/features/arrays-agent/tools/array/insertion";
import { createMultidimensionalTools } from "@/features/arrays-agent/tools/array/multidimensional";
import { createSearchTools } from "@/features/arrays-agent/tools/array/search";
import { createSortingTools } from "@/features/arrays-agent/tools/array/sorting";
import { createTeachingTools } from "@/features/arrays-agent/tools/array/teaching";
import { createTraversalTools } from "@/features/arrays-agent/tools/array/traversal";
import { createBlockTools } from "@/features/arrays-agent/tools/blocks";
import { createPresentationTools } from "@/features/arrays-agent/tools/presentation";

/**
 * The agent's whole vocabulary, as an AI SDK ToolSet.
 *
 * It is a factory rather than a constant because every tool closes over the
 * context it acts on — which is what lets the same definitions drive the voice
 * session, a text chat, and the demo page without any of them knowing about
 * the others.
 */
export function createArrayTools(ctx: ArrayToolContext) {
  return {
    ...createCreationTools(ctx),
    ...createAccessTools(ctx),
    ...createTraversalTools(ctx),
    ...createInsertionTools(ctx),
    ...createDeletionTools(ctx),
    ...createSearchTools(ctx),
    ...createSortingTools(ctx),
    ...createAnalysisTools(ctx),
    ...createMultidimensionalTools(ctx),
    ...createCanvasTools(ctx),
    ...createAnimationTools(ctx),
    ...createTeachingTools(ctx),
    ...createPresentationTools(ctx),
    ...createBlockTools(ctx),
  };
}

export type ArrayToolSet = ReturnType<typeof createArrayTools>;
export type ArrayToolName = keyof ArrayToolSet;
