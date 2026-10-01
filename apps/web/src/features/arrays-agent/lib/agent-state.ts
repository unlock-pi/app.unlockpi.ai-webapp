/**
 * The agent's authoritative view of the world — distinct from
 * `@unlockpi/blocks/array`'s vocabulary (`ArrayOpResult`, `AnimationSpeed`,
 * ...), which every array operation shares regardless of who's calling it.
 * This file is what's ADDITIONALLY true only because a voice agent is
 * driving a specific canvas block: which block, which frame it's on,
 * teaching mode. A pre-authored lesson or any other future producer of array
 * operations has no notion of a canvas or a voice session and shouldn't need
 * one to use the array vocabulary — that's why this split exists.
 */
import type { AnimationSpeed, ArrayValue } from "@unlockpi/blocks/array";

export type { AnimationSpeed };

/**
 * The agent's authoritative view of the world. Tools read and write THIS —
 * never whatever the model happens to remember from the conversation. When the
 * teacher says "remove the second element", this is what "second" resolves
 * against.
 */
export type ArrayAgentState = {
  activeCanvasId: string | null;
  /** Frame (slide) the array block currently lives on. */
  activeFrameId: string | null;
  array: {
    /** Canvas block id, null until a block exists. */
    id: string | null;
    name: string;
    values: ArrayValue[];
    /** Rows/cols for a 2-D array; a flat array is `[values.length]`. */
    dimensions: number[];
    selectedIndex: number | null;
    showIndices: boolean;
  };
  teaching: {
    topic: string | null;
    algorithm: string | null;
    /** How fast operations animate. See `AnimationSpeed`. */
    speed: AnimationSpeed;
  };
};

export function createInitialAgentState(
  canvasId: string | null = null,
): ArrayAgentState {
  return {
    activeCanvasId: canvasId,
    activeFrameId: null,
    array: {
      id: null,
      name: "A",
      values: [],
      dimensions: [0],
      selectedIndex: null,
      showIndices: true,
    },
    teaching: { topic: null, algorithm: null, speed: "normal" },
  };
}

/**
 * One-line state description sent back to the model after every tool call.
 *
 * It rides along on EVERY tool result, so it has to be small: the previous
 * multi-field JSON was repeated dozens of times per class and ate the context
 * window the conversation itself needed.
 */
export function describeAgentState(state: ArrayAgentState): string {
  const { array } = state;
  if (array.values.length === 0) return "No array on the board.";

  const grid =
    array.dimensions.length === 2
      ? ` as a ${array.dimensions[0]}x${array.dimensions[1]} grid`
      : "";
  const selected =
    array.selectedIndex === null ? "" : `, index ${array.selectedIndex} selected`;
  return `${array.name} = [${array.values.join(", ")}] (${array.values.length} elements${grid}${selected})`;
}
