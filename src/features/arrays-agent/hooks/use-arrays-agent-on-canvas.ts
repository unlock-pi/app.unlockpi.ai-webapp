"use client";

import { useCallback } from "react";

import { useArraysCanvasBridge } from "@/features/arrays-agent/hooks/use-arrays-canvas-bridge";
import { useArraysVoiceAgent } from "@/features/arrays-agent/hooks/use-arrays-voice-agent";
import type { ArrayValue } from "@/features/arrays-agent/lib/array-types";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

type Args = {
  canvasId?: string | null;
  canvasTitle?: string;
  responseMode?: "audio" | "silent";
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
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
}: Args) {
  const bridge = useArraysCanvasBridge({
    getDocument,
    getActiveFrameId,
    applyDocument,
  });

  const { commitValues, ensureArrayBlock, releaseTarget } = bridge;

  const handleEnsureArray = useCallback(
    (values: ArrayValue[], name: string) => {
      ensureArrayBlock(values, name);
    },
    [ensureArrayBlock],
  );

  const handleCommit = useCallback(
    (values: ArrayValue[]) => {
      commitValues(values);
    },
    [commitValues],
  );

  const agent = useArraysVoiceAgent({
    canvasId,
    lessonTitle: canvasTitle,
    responseMode,
    onEnsureArray: handleEnsureArray,
    onCommit: handleCommit,
    onClear: releaseTarget,
  });

  return {
    agent,
    targetBlockId: bridge.targetBlockId,
    viewProviderProps: {
      blockId: bridge.targetBlockId,
      view: agent.view,
      showIndices: agent.agentState.array.showIndices,
    },
  };
}
