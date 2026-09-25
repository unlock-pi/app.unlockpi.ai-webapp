"use client";

import { useCallback, useEffect, useRef } from "react";

import { useCountingCanvasBridge } from "@/features/counting-agent/hooks/use-counting-canvas-bridge";
import { useCountingVoiceAgent } from "@/features/counting-agent/hooks/use-counting-voice-agent";
import type { CountingAgentState } from "@/features/counting-agent/lib/counting-types";
import type { PresentationControls } from "@/features/counting-agent/tools/tool-context";
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
};

/**
 * Tally (the counting agent), wired to a canvas. Mirrors
 * `useArraysAgentOnCanvas`, trimmed for a single number strip: no
 * "combine" concept and no code-block sync, since a strip is never mirrored
 * as code.
 */
export function useCountingAgentOnCanvas({
  canvasId = null,
  canvasTitle,
  responseMode = "audio",
  getDocument,
  getActiveFrameId,
  applyDocument,
  presentation,
  activeFrameId,
  enabled = true,
}: Args) {
  const bridge = useCountingCanvasBridge({
    getDocument,
    getActiveFrameId,
    applyDocument,
  });

  const { adoptFrameCountingStrip, blockControls, commitCountingStrip, releaseTarget } = bridge;

  const handleCommit = useCallback(
    (state: CountingAgentState) => {
      if (state.strip.total === 0) return;
      commitCountingStrip({
        total: state.strip.total,
        order: state.strip.order,
        mode: state.strip.mode,
        highlights: state.strip.highlights,
        division: state.strip.division,
        note: "",
      });
    },
    [commitCountingStrip],
  );

  const agent = useCountingVoiceAgent({
    canvasId,
    lessonTitle: canvasTitle,
    responseMode,
    onCommit: handleCommit,
    onClear: releaseTarget,
    presentation,
    blocks: blockControls,
  });

  // Re-point the agent at whatever strip the class is now looking at — same
  // reasoning as the arrays agent's frame-adoption effect: without it, "divide
  // by 5" on a frame the teacher authored would start from an empty strip
  // instead of the one already on screen.
  const { adoptStrip } = agent;
  const adoptedFrameRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) {
      adoptedFrameRef.current = undefined;
      return;
    }
    const frameId = activeFrameId ?? null;
    if (adoptedFrameRef.current === frameId) return;
    adoptedFrameRef.current = frameId;
    const found = adoptFrameCountingStrip(frameId);
    adoptStrip(found);
  }, [activeFrameId, adoptFrameCountingStrip, adoptStrip, enabled]);

  return {
    agent,
    targetBlockId: bridge.targetBlockId,
    viewProviderProps: {
      blockId: bridge.targetBlockId,
      view: agent.view,
      isAnimating: agent.isAnimating,
    },
  };
}
