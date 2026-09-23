"use client";

import { useCallback, useEffect, useRef } from "react";

import { useArraysCanvasBridge } from "@/features/arrays-agent/hooks/use-arrays-canvas-bridge";
import { useArraysVoiceAgent } from "@/features/arrays-agent/hooks/use-arrays-voice-agent";
import type { VisualBlockType } from "@/features/arrays-agent/hooks/use-arrays-canvas-bridge";
import type {
  ArrayAgentState,
  ArrayValue,
} from "@/features/arrays-agent/lib/array-types";
import type { OperationRequest } from "@/features/arrays-agent/lib/operation-code";
import type { StructureKind } from "@/features/arrays-agent/lib/array-types";
import type { PresentationControls } from "@/features/arrays-agent/tools/tool-context";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

type Args = {
  canvasId?: string | null;
  canvasTitle?: string;
  responseMode?: "audio" | "silent";
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
  /** Frame navigation, so the teacher never has to touch the keyboard. */
  presentation?: PresentationControls;
  /** The frame currently on screen. Changing it re-points the agent. */
  activeFrameId?: string | null;
  /** False while another mode owns the class — the agent then adopts nothing. */
  enabled?: boolean;
  /** Which tutor starts: arrays, or stacks. They hand over by voice. */
  structure?: StructureKind;
  /** Told when they hand over, so the dock can follow. */
  onStructureChange?: (structure: StructureKind) => void;
};

/**
 * The arrays agent, wired to a canvas.
 *
 * Division of labour: the agent owns the array's values and animation while a
 * session runs, the bridge makes sure the canvas has a block to hold them and
 * writes settled values back into the document. Spread `viewProviderProps`
 * onto `ArraysAgentViewProvider` around the canvas render so the block being
 * driven picks up the live animation.
 */
export function useArraysAgentOnCanvas({
  canvasId = null,
  canvasTitle,
  responseMode = "audio",
  getDocument,
  getActiveFrameId,
  applyDocument,
  presentation,
  activeFrameId,
  enabled = true,
  structure = "array",
  onStructureChange,
}: Args) {
  const bridge = useArraysCanvasBridge({
    getDocument,
    getActiveFrameId,
    applyDocument,
  });

  const {
    adoptFrameArray,
    blockControls,
    combineControls,
    commitValues,
    ensureArrayBlock,
    releaseTarget,
  } = bridge;

  /**
   * Which block draws this agent's data right now.
   *
   * A stack gets the bucket, unless the teacher asked to see it on the array
   * strip — same cells, same push-and-pop rules, different picture.
   */
  const visualFor = (state: ArrayAgentState): VisualBlockType =>
    state.structure === "stack" && state.stackView === "bucket"
      ? "StackBlock"
      : "ArrayBlock";

  const handleEnsureArray = useCallback(
    (values: ArrayValue[], name: string, state: ArrayAgentState) => {
      ensureArrayBlock(values, name, visualFor(state));
    },
    [ensureArrayBlock],
  );

  const handleCommit = useCallback(
    (values: ArrayValue[], state: ArrayAgentState, operation?: OperationRequest | null) => {
      commitValues(values, state.array.name, operation, state.structure);
    },
    [commitValues],
  );

  const agent = useArraysVoiceAgent({
    canvasId,
    lessonTitle: canvasTitle,
    responseMode,
    structure,
    onStructureChange,
    onEnsureArray: handleEnsureArray,
    onCommit: handleCommit,
    onClear: releaseTarget,
    presentation,
    blocks: blockControls,
    combine: combineControls,
  });

  // Re-point the agent at whatever array the class is now looking at.
  //
  // This is what makes "add two more elements" work on a frame the teacher
  // authored: without it the agent's array starts empty and stays empty, so
  // an append would replace their array with a single element instead of
  // extending it. Keyed on the frame id, so it does not fire on the agent's
  // own edits to the frame it is already on.
  const { adoptArray, structure: agentStructure } = agent;
  const agentStackView = agent.agentState.stackView;
  // Adopting resets the agent's array and clears the player, so it must happen
  // once per frame — never once per render. The guard makes that true
  // regardless of whether every dependency stayed referentially stable, because
  // when one didn't the result was an infinite render loop that also wiped the
  // animation mid-play and re-sent board state on every pass.
  const adoptedFrameRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!enabled) {
      adoptedFrameRef.current = undefined;
      return;
    }
    const frameId = activeFrameId ?? null;
    // Keyed on the tutor as well as the frame: a handover has to re-read the
    // board, because the block worth driving may not be the one that was
    // being driven a moment ago.
    const key = `${agentStructure}:${frameId}`;
    if (adoptedFrameRef.current === key) return;
    adoptedFrameRef.current = key;
    adoptArray(
      adoptFrameArray(
        frameId,
        agentStructure === "stack" && agentStackView === "bucket"
          ? "StackBlock"
          : "ArrayBlock",
      ),
    );
    // agentStackView is read, not keyed on: changing how a stack is DRAWN is
    // not arriving on a new frame, and re-adopting would throw away the
    // animation that the view tools just set up.
  }, [
    activeFrameId,
    adoptArray,
    adoptFrameArray,
    agentStackView,
    agentStructure,
    enabled,
  ]);

  return {
    agent,
    targetBlockId: bridge.targetBlockId,
    structure: agentStructure,
    viewProviderProps: {
      blockId: bridge.targetBlockId,
      view: agent.view,
      showIndices: agent.agentState.array.showIndices,
      isAnimating: agent.isAnimating,
    },
  };
}
