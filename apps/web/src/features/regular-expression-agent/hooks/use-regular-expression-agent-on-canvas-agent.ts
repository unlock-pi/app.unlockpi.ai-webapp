"use client";

import { useCallback, useEffect, useRef } from "react";

import { useRegularExpressionCanvasBridge } from "@/features/regular-expression-agent/hooks/use-regular-expression-canvas-bridge-agent";
import { useRegularExpressionVoiceAgent } from "@/features/regular-expression-agent/hooks/use-regular-expression-voice-agent";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

type Args = {
  canvasId?: string | null;
  canvasTitle?: string;
  responseMode?: "audio" | "silent";
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (
    document: CanvasDocument,
    activeFrameId: string | null,
  ) => void;
  activeFrameId?: string | null;
  enabled?: boolean;
};

export function useRegularExpressionAgentOnCanvas({
  canvasId = null,
  canvasTitle,
  responseMode = "audio",
  getDocument,
  getActiveFrameId,
  applyDocument,
  activeFrameId,
  enabled = true,
}: Args) {
  const bridge = useRegularExpressionCanvasBridge({
    getDocument,
    getActiveFrameId,
    applyDocument,
  });
  const {
    adoptFrameRegularExpressions,
    commitRegularExpression,
    targetBlockId,
  } = bridge;
  const adoptedFrameRef = useRef<string | null | undefined>(undefined);

  const handleExpressionChange = useCallback(
    (expression: string, input: string) => {
      commitRegularExpression(expression, input);
      // A new RE block may open a frame; adopting it would clear its timeline.
      adoptedFrameRef.current = getActiveFrameId();
    },
    [commitRegularExpression, getActiveFrameId],
  );

  const agent = useRegularExpressionVoiceAgent({
    canvasId,
    lessonTitle: canvasTitle,
    responseMode,
    onExpressionChange: handleExpressionChange,
  });

  const { adoptRegularExpressions } = agent;

  useEffect(() => {
    if (!enabled) {
      adoptedFrameRef.current = undefined;
      return;
    }
    const frameId = activeFrameId ?? null;
    if (adoptedFrameRef.current === frameId) return;
    adoptedFrameRef.current = frameId;
    adoptRegularExpressions(adoptFrameRegularExpressions(frameId));
  }, [
    activeFrameId,
    adoptFrameRegularExpressions,
    adoptRegularExpressions,
    enabled,
  ]);

  return {
    agent,
    viewProviderProps: {
      blockId: targetBlockId,
      state: agent.view,
      onStep: agent.stepSelected,
      onReset: agent.resetSelected,
      onPlaybackComplete: agent.onPlaybackComplete,
      automatonConstruction: agent.automatonConstruction,
      onConstructionAnimationComplete: agent.onConstructionAnimationComplete,
      onConstructionReady: agent.onConstructionReady,
      onDisplayModeChange: agent.setDisplayMode,
    },
  };
}
