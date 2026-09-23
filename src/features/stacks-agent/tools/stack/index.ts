import { createAnimationTools } from "@/features/arrays-agent/tools/array/animation";
import { createBlockTools } from "@/features/arrays-agent/tools/blocks";
import { createPresentationTools } from "@/features/arrays-agent/tools/presentation";
import type { ArrayToolContext } from "@/features/arrays-agent/tools/tool-context";
import { createStackApplicationTools } from "@/features/stacks-agent/tools/stack/applications";
import { createStackBoardTools } from "@/features/stacks-agent/tools/stack/board";
import { createStackCoreTools } from "@/features/stacks-agent/tools/stack/core";
import { createStackInspectionTools } from "@/features/stacks-agent/tools/stack/inspection";
import { createStackViewTools } from "@/features/stacks-agent/tools/stack/view";

/**
 * The stacks tutor's whole vocabulary.
 *
 * Three of these sets are the arrays tutor's own, imported unchanged:
 * animation pacing, moving between frames and editing the frame's blocks are
 * about running a lesson, not about which structure is on the board. What is
 * new here is only what a stack actually does — which is the point: the
 * restriction is the lesson, so the tool list is short on purpose.
 *
 * What is deliberately ABSENT is as much a part of the design as what is
 * here. There is no insert_at_index, no delete_from_beginning, no sort. A
 * teacher who asks for one gets a refusal that explains why, and that
 * refusal teaches more than quietly reaching into the middle would.
 */
export function createStackTools(ctx: ArrayToolContext) {
  return {
    ...createStackCoreTools(ctx),
    ...createStackInspectionTools(ctx),
    ...createStackApplicationTools(ctx),
    ...createStackBoardTools(ctx),
    ...createStackViewTools(ctx),
    // Shared with the arrays tutor — same lesson, same canvas, same pacing.
    ...createAnimationTools(ctx),
    ...createPresentationTools(ctx),
    ...createBlockTools(ctx),
  };
}

export type StackToolSet = ReturnType<typeof createStackTools>;
export type StackToolName = keyof StackToolSet;
