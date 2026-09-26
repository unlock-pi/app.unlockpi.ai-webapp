"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContextFreeGrammarCanvasBridge } from "@/features/context-free-grammar-agent/hooks/use-context-free-grammar-canvas-bridge";
import { useContextFreeGrammarVoiceAgent } from "@/features/context-free-grammar-agent/hooks/use-context-free-grammar-voice-agent";
import type { GrammarCommitChange } from "@/features/context-free-grammar-agent/tool-context";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

type Args = {
  canvasId?: string | null;
  canvasTitle?: string;
  responseMode?: "audio" | "silent";
  getDocument: () => CanvasDocument;
  getActiveFrameId: () => string | null;
  applyDocument: (document: CanvasDocument, activeFrameId: string | null) => void;
  activeFrameId?: string | null;
  enabled?: boolean;
};

export function useContextFreeGrammarAgentOnCanvas({
  canvasId = null, canvasTitle, responseMode = "audio",
  getDocument, getActiveFrameId, applyDocument,
  activeFrameId, enabled = true,
}: Args) {
  const bridge = useContextFreeGrammarCanvasBridge({ getDocument, getActiveFrameId, applyDocument });
  const { adoptFrameGrammars, createGrammarBlock, updateGrammarBlock, selectGrammarBlock, targetBlockId } = bridge;
  const handleCommit = useCallback((change: GrammarCommitChange) => {
    if (change.kind === "create") return createGrammarBlock(change.grammarId, change.props);
    if (change.kind === "update") return updateGrammarBlock(change.grammarId, change.props);
    return selectGrammarBlock(change.grammarId);
  }, [createGrammarBlock, selectGrammarBlock, updateGrammarBlock]);
  const agent = useContextFreeGrammarVoiceAgent({
    canvasId, lessonTitle: canvasTitle, responseMode, onCommit: handleCommit,
  });
  const { adoptGrammars } = agent;
  const adoptedFrameRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) { adoptedFrameRef.current = undefined; return; }
    const frameId = activeFrameId ?? null;
    if (adoptedFrameRef.current === frameId) return;
    adoptedFrameRef.current = frameId;
    const adopted = adoptFrameGrammars(frameId);
    adoptGrammars(adopted.all, adopted.selectedGrammarId);
  }, [activeFrameId, adoptFrameGrammars, adoptGrammars, enabled]);
  return {
    agent,
    viewProviderProps: {
      blockId: targetBlockId,
      state: agent.view,
      onStep: agent.stepSelected,
      onReset: agent.resetSelected,
      onPlaybackComplete: agent.onPlaybackComplete,
    },
  };
}
