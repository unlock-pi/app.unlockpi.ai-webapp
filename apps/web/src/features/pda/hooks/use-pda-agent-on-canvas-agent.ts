"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OpenAIRealtimeClient } from "@/lib/openai-realtime/realtime-client";
import type { RealtimeStatus } from "@/lib/openai-realtime/types";
import { EMPTY_LATENCY, appendEvent, summarizeArgs, type AgentEvent, type AgentLatency } from "@/features/arrays-agent/lib/agent-activity";

import {
  createInitialPDAState,
  createPDATools,
  type PDAState,
} from "@/features/pda/tools-agent";
import { createPDAExecution, type PDA } from "@/features/pda/model-agent";
import { usePDACanvasBridge, type FramePDASnapshot } from "@/features/pda/hooks/use-pda-canvas-bridge-agent";
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

export function usePDAAgentOnCanvas({
  canvasId = null, canvasTitle, responseMode = "audio", getDocument, getActiveFrameId, applyDocument, activeFrameId, enabled = true,
}: Args) {
  const [status, setStatus] = useState<RealtimeStatus | "paused">("idle");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [latency] = useState<AgentLatency>(EMPTY_LATENCY);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const bridge = usePDACanvasBridge({ getDocument, getActiveFrameId, applyDocument });
  const { adoptFramePDAs, ensurePDABlock } = bridge;
  const [state, setState] = useState<PDAState>(() => createInitialPDAState());
  const stateRef = useRef(state);
  const adoptedFrameRef = useRef<string | null | undefined>(undefined);

  const commit = useCallback((next: PDAState) => {
    stateRef.current = structuredClone(next);
    setState(structuredClone(next));
    const selected = next.selectedId ? next.pdas[next.selectedId] : undefined;
    if (selected) {
      ensurePDABlock(selected, next.executions[selected.id]?.input ?? "");
      adoptedFrameRef.current = getActiveFrameId();
    }
  }, [ensurePDABlock, getActiveFrameId]);

  const tools = useMemo(() => createPDATools({
    get state() { return stateRef.current; },
    commit,
  }), [commit]);

  const adopt = useCallback((snapshots: FramePDASnapshot[]) => {
    const next = createInitialPDAState();
    for (const snapshot of snapshots) {
      next.pdas[snapshot.pda.id] = snapshot.pda;
      next.executions[snapshot.pda.id] = createPDAExecution(snapshot.pda, snapshot.input);
    }
    const selected = snapshots.at(-1);
    next.selectedId = selected?.pda.id ?? null;
    stateRef.current = next;
    setState(structuredClone(next));
  }, []);

  useEffect(() => {
    if (!enabled) {
      adoptedFrameRef.current = undefined;
      return;
    }
    const frameId = activeFrameId ?? null;
    if (adoptedFrameRef.current === frameId) return;
    adoptedFrameRef.current = frameId;
    adopt(adoptFramePDAs(frameId));
  }, [activeFrameId, adopt, adoptFramePDAs, enabled]);

  const selectedPda = state.selectedId ? state.pdas[state.selectedId] ?? null : null;
  const selectedExecution = selectedPda ? state.executions[selectedPda.id] ?? null : null;
  const create = useCallback((pda: PDA, input: string) => {
    const definition = tools.create_pda as unknown as { execute: (value: object, options: object) => Promise<unknown> };
    return definition.execute({ ...pda, pdaId: pda.id, input }, {});
  }, [tools]);

  const run = useCallback((name: "step_pda" | "simulate_pda" | "reset_pda") => {
    const definition = tools[name] as unknown as { execute: (input: object, options: object) => Promise<unknown> };
    return definition.execute({ pdaId: stateRef.current.selectedId }, {});
  }, [tools]);

  const runRealtimeTool = useCallback(async (name: string, argumentsJson: string) => {
    const definition = tools[name as keyof typeof tools] as unknown as { execute?: (input: object, options: object) => Promise<{ ok?: boolean; summary?: string }> };
    if (!definition?.execute) return JSON.stringify({ ok: false, success: false, summary: "Unknown PDA tool." });
    let input: object;
    try { input = JSON.parse(argumentsJson || "{}"); }
    catch { return JSON.stringify({ ok: false, success: false, summary: "Tool arguments must be JSON." }); }
    const startedAt = performance.now();
    try {
      const result = await definition.execute(input, {});
      setEvents((current) => appendEvent(current, { kind: "tool", at: Date.now(), name, ok: result.ok !== false, durationMs: performance.now() - startedAt, summary: result.summary ?? "", args: summarizeArgs(argumentsJson) }));
      return JSON.stringify(result);
    } catch (reason) {
      const summary = reason instanceof Error ? reason.message : "PDA tool failed.";
      setEvents((current) => appendEvent(current, { kind: "error", at: Date.now(), text: summary }));
      return JSON.stringify({ ok: false, success: false, summary });
    }
  }, [tools]);
  const disconnect = useCallback(() => { clientRef.current?.disconnect(); clientRef.current = null; setStatus("idle"); setCaption(""); setRemoteStream(null); setIsUserSpeaking(false); setIsResponding(false); }, []);
  const connect = useCallback(async () => {
    if (clientRef.current || status === "connecting") return;
    setError(null);
    const client = new OpenAIRealtimeClient({ tokenEndpoint: "/api/openai/realtime/pda-agent", tokenBody: { canvasId, lessonTitle: canvasTitle, responseMode }, onToolCall: (call) => runRealtimeTool(call.name, call.argumentsJson), onStatusChange: setStatus, onError: setError, onRemoteStream: setRemoteStream, onTranscriptDelta: (delta) => setCaption((current) => current + delta), onUserTranscript: (text) => setEvents((current) => appendEvent(current, { kind: "heard", at: Date.now(), text })), onResponseCreated: () => setIsResponding(true), onResponseDone: () => setIsResponding(false), onSpeechStarted: () => setIsUserSpeaking(true), onSpeechStopped: () => setIsUserSpeaking(false) });
    clientRef.current = client; await client.connect();
  }, [canvasId, canvasTitle, responseMode, runRealtimeTool, status]);
  const toggleMic = useCallback(() => setMicEnabled((current) => { const next = !current; clientRef.current?.setMicrophoneEnabled(next); return next; }), []);

  return {
    agent: { caption, connect, disconnect, error, events, isConnected: status === "connected" || status === "paused", isResponding, isUserSpeaking, lastToolCall: null, latency, micEnabled, remoteStream, status, toggleMic },
    tools,
    state,
    viewProviderProps: {
      blockId: selectedPda?.id ?? null,
      pda: selectedPda,
      execution: selectedExecution,
      onStep: () => void run("step_pda"),
      onRun: () => void run("simulate_pda"),
      onReset: () => void run("reset_pda"),
      onCreate: (pda: PDA, input: string) => void create(pda, input),
    },
  };
}
