"use client";

import { useCallback, useEffect, useRef } from "react";

import type { Automaton } from "@/components/automata/model";
import { useAutomataCanvasBridge } from "@/features/automata-agent/hooks/use-automata-canvas-bridge";
import { useAutomataVoiceAgent } from "@/features/automata-agent/hooks/use-automata-voice-agent";
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

export function useAutomataAgentOnCanvas({
  canvasId = null,
  canvasTitle,
  responseMode = "audio",
  getDocument,
  getActiveFrameId,
  applyDocument,
  activeFrameId,
  enabled = true,
}: Args) {
  const bridge = useAutomataCanvasBridge({
    getDocument,
    getActiveFrameId,
    applyDocument,
  });
  const {
    adoptFrameAutomata,
    commitAutomaton,
    ensureAutomatonBlock,
    selectAutomaton,
    targetBlockId,
  } = bridge;

  const handleCreate = useCallback(
    (automaton: Automaton, input: string) => ensureAutomatonBlock(automaton, input),
    [ensureAutomatonBlock],
  );
  const handleDefinitionChange = useCallback(
    (automaton: Automaton, input: string) => commitAutomaton(automaton, input),
    [commitAutomaton],
  );
  const handleSelectionChange = useCallback(
    (automatonId: string | null) => selectAutomaton(automatonId),
    [selectAutomaton],
  );

  const agent = useAutomataVoiceAgent({
    canvasId,
    lessonTitle: canvasTitle,
    responseMode,
    onCreate: handleCreate,
    onDefinitionChange: handleDefinitionChange,
    onSelectionChange: handleSelectionChange,
  });

  const { adoptAutomata } = agent;
  const adoptedFrameRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled) {
      adoptedFrameRef.current = undefined;
      return;
    }
    const frameId = activeFrameId ?? null;
    if (adoptedFrameRef.current === frameId) return;
    adoptedFrameRef.current = frameId;
    adoptAutomata(adoptFrameAutomata(frameId));
  }, [activeFrameId, adoptAutomata, adoptFrameAutomata, enabled]);

  return {
    agent,
    viewProviderProps: {
      blockId: targetBlockId,
      automaton: agent.automaton,
      execution: agent.execution,
      onStep: agent.stepSelected,
      onReset: agent.resetSelected,
    },
  };
}
