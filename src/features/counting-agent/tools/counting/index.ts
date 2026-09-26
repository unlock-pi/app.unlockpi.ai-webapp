import type { CountingToolContext } from "@/features/counting-agent/tools/tool-context";
import { createBlockTools } from "@/features/counting-agent/tools/blocks";
import { createTextHighlightTools } from "@/features/canvas/tools/text-highlight-tools";
import { createCanvasTools } from "@/features/counting-agent/tools/counting/canvas";
import { createCreationTools } from "@/features/counting-agent/tools/counting/creation";
import { createDivisionTools } from "@/features/counting-agent/tools/counting/division";
import { createExtractionTools } from "@/features/counting-agent/tools/counting/extraction";
import { createFactorialAnalysisTools } from "@/features/counting-agent/tools/counting/factorial-analysis";
import { createGridViewTools } from "@/features/counting-agent/tools/counting/grid-view";
import { createHighlightTools } from "@/features/counting-agent/tools/counting/highlight";
import { createOrderTools } from "@/features/counting-agent/tools/counting/order";
import { createTeachingTools } from "@/features/counting-agent/tools/counting/teaching";
import { createTraversalTools } from "@/features/counting-agent/tools/counting/traversal";
import { createPresentationTools } from "@/features/counting-agent/tools/presentation";

/**
 * The agent's whole vocabulary, as an AI SDK ToolSet. A factory rather than a
 * constant because every tool closes over the context it acts on.
 */
export function createCountingTools(ctx: CountingToolContext) {
  return {
    ...createCreationTools(ctx),
    ...createHighlightTools(ctx),
    ...createDivisionTools(ctx),
    ...createOrderTools(ctx),
    ...createTraversalTools(ctx),
    ...createExtractionTools(ctx),
    ...createFactorialAnalysisTools(ctx),
    ...createGridViewTools(ctx),
    ...createCanvasTools(ctx),
    ...createTeachingTools(ctx),
    ...createPresentationTools(ctx),
    ...createBlockTools(ctx),
    ...createTextHighlightTools(ctx),
  };
}

export type CountingToolSet = ReturnType<typeof createCountingTools>;
export type CountingToolName = keyof CountingToolSet;
