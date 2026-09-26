"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { PlaybackCoordinator } from "@/components/toc/shared/playback-coordinator";
import {
  appendEvent, EMPTY_LATENCY, summarizeArgs,
  type AgentEvent, type AgentLatency,
} from "@/features/arrays-agent/lib/agent-activity";
import {
  createGrammarRecord, createInitialContextFreeGrammarAgentState,
  type ContextFreeGrammarAgentState,
} from "@/features/context-free-grammar-agent/agent-state";
import { buildContextFreeGrammarLiveContext } from "@/features/context-free-grammar-agent/agent-context";
import type { FrameGrammarSnapshot } from "@/features/context-free-grammar-agent/hooks/use-context-free-grammar-canvas-bridge";
import { createContextFreeGrammarTools } from "@/features/context-free-grammar-agent/tools";
import type { GrammarCommitChange, GrammarToolContext } from "@/features/context-free-grammar-agent/tool-context";
import type { GrammarError } from "@/features/context-free-grammar/grammar-engine";
import { finishRealtimeUsageSession, trackRealtimeResponse } from "@/features/realtime/lib/realtime-usage-client";
import type { RealtimeUsageResponse } from "@/features/realtime/types/realtime-usage";
import { OpenAIRealtimeClient } from "@/lib/openai-realtime/realtime-client";
import type { RealtimeStatus } from "@/lib/openai-realtime/types";

type Args = {
  canvasId?: string | null;
  lessonTitle?: string;
  responseMode?: "audio" | "silent";
  onCommit?: (change: GrammarCommitChange) => GrammarError | null;
};

export function useContextFreeGrammarVoiceAgent({
  canvasId = null, lessonTitle, responseMode = "audio", onCommit,
}: Args = {}) {
  const [status, setStatus] = useState<RealtimeStatus | "paused">("idle");
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [latency, setLatency] = useState<AgentLatency>(EMPTY_LATENCY);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const [initialState] = useState(() => createInitialContextFreeGrammarAgentState(canvasId));
  const stateRef = useRef<ContextFreeGrammarAgentState>(initialState);
  const [snapshot, setSnapshot] = useState(() => structuredClone(initialState));
  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const [playback] = useState(() => new PlaybackCoordinator());
  const playbackSequence = useRef(0);
  const usageSessionIdRef = useRef<string | null>(null);
  const contextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionBufferRef = useRef("");
  const speechEndedAtRef = useRef<number | null>(null);
  const responseSamplesRef = useRef<number[]>([]);
  const onCommitRef = useRef(onCommit);
  useEffect(() => { onCommitRef.current = onCommit; }, [onCommit]);

  const logEvent = useCallback((event: AgentEvent) => setEvents((prior) => appendEvent(prior, event)), []);
  const pushLiveContext = useCallback(() => {
    clientRef.current?.replaceContext("live", buildContextFreeGrammarLiveContext(stateRef.current));
  }, []);
  const scheduleLiveContext = useCallback(() => {
    if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
    contextTimerRef.current = setTimeout(() => { contextTimerRef.current = null; pushLiveContext(); }, 150);
  }, [pushLiveContext]);
  useEffect(() => () => {
    if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
  }, []);

  const ctx = useMemo<GrammarToolContext>(() => ({
    get state() { return stateRef.current; },
    async commit(next, change) {
      const issue = change ? onCommitRef.current?.(change) : null;
      if (issue) return issue;
      const id = next.selectedGrammarId;
      if (id && next.grammars[id]) {
        const previous = stateRef.current.grammars[id]?.view;
        const view = next.grammars[id].view;
        const signature = (value: typeof view | undefined) => JSON.stringify([
          value?.currentDerivationStep, value?.derivationSteps, value?.parseTree,
          value?.selectedParseTreeNodeId, value?.highlightedSubtreeRootIds,
        ]);
        view.playbackId = signature(previous) !== signature(view)
          ? id + ":playback:" + ++playbackSequence.current
          : previous?.playbackId;
      }
      stateRef.current = structuredClone(next);
      setSnapshot(structuredClone(next));
      scheduleLiveContext();
      return null;
    },
  }), [scheduleLiveContext]);
  const tools = useMemo(() => createContextFreeGrammarTools(ctx), [ctx]);

  const onPlaybackComplete = useCallback(
    (id: string, count: number) => playback.report(id, count), [playback],
  );
  const executeWithPlayback = useCallback(
    (execute: () => unknown) => playback.run(async () => {
      const before = stateRef.current;
      const beforeId = before.selectedGrammarId ? before.grammars[before.selectedGrammarId]?.view.playbackId : undefined;
      const outcome = await execute();
      const after = stateRef.current;
      const afterId = after.selectedGrammarId ? after.grammars[after.selectedGrammarId]?.view.playbackId : undefined;
      if (afterId && afterId !== beforeId) await playback.wait(afterId, 1);
      return outcome;
    }), [playback],
  );

  const runTool = useCallback(async (name: string, argumentsJson: string) => {
    const definition = tools[name as keyof typeof tools] as {
      execute?: (input: unknown, options: unknown) => unknown;
      inputSchema?: unknown;
    } | undefined;
    if (!definition?.execute) return JSON.stringify({
      success: false, ok: false,
      error: { code: "INVALID_OPERATION", message: name + " is not a CFG tool." },
    });
    let input: unknown;
    try { input = JSON.parse(argumentsJson || "{}"); }
    catch { return JSON.stringify({ success: false, ok: false, error: { code: "INVALID_OPERATION", message: "Arguments were not valid JSON." } }); }
    if (definition.inputSchema instanceof z.ZodType) {
      const parsed = definition.inputSchema.safeParse(input);
      if (!parsed.success) return JSON.stringify({
        success: false, ok: false,
        error: { code: "INVALID_TOOL_INPUT", message: "Arguments did not match the tool schema.", details: z.flattenError(parsed.error) },
      });
      input = parsed.data;
    }
    setLastToolCall(name);
    const startedAt = performance.now();
    try {
      const outcome = await executeWithPlayback(() => definition.execute!(input, {})) as { ok?: boolean; summary?: string };
      const durationMs = performance.now() - startedAt;
      logEvent({ kind: "tool", at: Date.now(), name, ok: outcome.ok !== false, durationMs, summary: outcome.summary ?? "", args: summarizeArgs(argumentsJson) });
      setLatency((prior) => ({
        ...prior, toolCalls: prior.toolCalls + 1,
        toolFailures: prior.toolFailures + (outcome.ok === false ? 1 : 0),
        slowestToolMs: Math.max(prior.slowestToolMs ?? 0, durationMs),
      }));
      return JSON.stringify(outcome);
    } catch (thrown) {
      const message = thrown instanceof Error ? thrown.message : name + " failed.";
      console.error("[cfg-agent] " + name + " threw:", thrown);
      logEvent({ kind: "error", at: Date.now(), text: message });
      return JSON.stringify({ success: false, ok: false, error: { code: "INVALID_OPERATION", message } });
    }
  }, [executeWithPlayback, logEvent, tools]);

  const disconnect = useCallback(() => {
    playback.cancel();
    finishRealtimeUsageSession(usageSessionIdRef.current);
    usageSessionIdRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    captionBufferRef.current = "";
    speechEndedAtRef.current = null;
    setCaption("");
    setRemoteStream(null);
    setIsUserSpeaking(false);
    setIsResponding(false);
    setMicEnabled(true);
    setStatus("idle");
  }, [playback]);
  useEffect(() => disconnect, [disconnect]);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected" || status === "paused") return;
    setError(null);
    const client = new OpenAIRealtimeClient({
      tokenEndpoint: "/api/openai/realtime/context-free-grammar-agent",
      tokenBody: { canvasId, lessonTitle, responseMode },
      onUsageSessionCreated: (id) => { usageSessionIdRef.current = id; },
      onToolCall: (call) => runTool(call.name, call.argumentsJson),
      onStatusChange: (next) => {
        setStatus(next);
        logEvent({ kind: "status", at: Date.now(), text: next });
        if (next === "connected") pushLiveContext();
      },
      onServerError: (message, code) => logEvent({ kind: "error", at: Date.now(), text: code ? message + " (" + code + ")" : message }),
      onError: (message) => {
        finishRealtimeUsageSession(usageSessionIdRef.current, "failed");
        usageSessionIdRef.current = null;
        setError(message);
        logEvent({ kind: "error", at: Date.now(), text: message });
      },
      onRemoteStream: setRemoteStream,
      onTranscriptDelta: (delta) => {
        captionBufferRef.current += delta;
        setCaption(captionBufferRef.current);
      },
      onUserTranscript: (text) => logEvent({ kind: "heard", at: Date.now(), text }),
      onResponseCreated: () => setIsResponding(true),
      onFirstOutput: () => {
        const startedAt = speechEndedAtRef.current;
        if (startedAt === null) return;
        const responseMs = performance.now() - startedAt;
        speechEndedAtRef.current = null;
        responseSamplesRef.current = [...responseSamplesRef.current, responseMs].slice(-20);
        const samples = responseSamplesRef.current;
        setLatency((prior) => ({
          ...prior, responseMs,
          averageResponseMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
        }));
        logEvent({ kind: "thinking", at: Date.now(), latencyMs: responseMs });
      },
      onResponseDone: (response) => {
        setIsResponding(false);
        const spoken = captionBufferRef.current.trim();
        if (spoken) logEvent({ kind: "said", at: Date.now(), text: spoken });
        captionBufferRef.current = "";
        trackRealtimeResponse(usageSessionIdRef.current, response as RealtimeUsageResponse | undefined);
      },
      onSpeechStarted: () => { setIsUserSpeaking(true); captionBufferRef.current = ""; setCaption(""); },
      onSpeechStopped: () => { setIsUserSpeaking(false); speechEndedAtRef.current = performance.now(); },
      onToolCallStart: (call) => setLastToolCall(call.name),
    });
    clientRef.current = client;
    await client.connect();
  }, [canvasId, lessonTitle, logEvent, pushLiveContext, responseMode, runTool, status]);

  const adoptGrammars = useCallback((snapshots: FrameGrammarSnapshot[], selectedGrammarId: string | null) => {
    playback.cancel();
    const previous = stateRef.current;
    const next = createInitialContextFreeGrammarAgentState(canvasId);
    for (const snapshot of snapshots) {
      const existing = previous.grammars[snapshot.grammarId];
      const unchanged = existing && JSON.stringify(existing.grammar) === JSON.stringify(snapshot.props.grammar) && existing.input === snapshot.props.input;
      const record = unchanged ? structuredClone(existing) : createGrammarRecord(snapshot.grammarId, snapshot.props.grammar, snapshot.props.input);
      if (!unchanged) {
        record.view.derivationSteps = snapshot.props.derivationSteps;
        record.view.parseTree = snapshot.props.parseTree;
      }
      next.grammarOrder.push(snapshot.grammarId);
      next.grammars[snapshot.grammarId] = record;
    }
    next.selectedGrammarId = selectedGrammarId && next.grammars[selectedGrammarId] ? selectedGrammarId : null;
    stateRef.current = next;
    setSnapshot(structuredClone(next));
    scheduleLiveContext();
  }, [canvasId, playback, scheduleLiveContext]);

  const toggleMic = useCallback(() => {
    setMicEnabled((enabled) => {
      const next = !enabled;
      clientRef.current?.setMicrophoneEnabled(next);
      return next;
    });
  }, []);
  const runDirect = useCallback(async (name: keyof typeof tools) => {
    const definition = tools[name] as unknown as { execute: (input: unknown, options: unknown) => Promise<unknown> };
    try {
      await executeWithPlayback(() => definition.execute({}, {}));
    } catch (error) {
      if (!(error instanceof Error && error.message === "Playback was cancelled.")) {
        setError(error instanceof Error ? error.message : "Playback failed.");
      }
    }
  }, [executeWithPlayback, tools]);
  const stepSelected = useCallback(() => { void runDirect("step_derivation"); }, [runDirect]);
  const resetSelected = useCallback(() => { playback.cancel(); void runDirect("reset_derivation"); }, [playback, runDirect]);

  return {
    onPlaybackComplete,
    agentState: snapshot,
    view: snapshot.selectedGrammarId ? snapshot.grammars[snapshot.selectedGrammarId]?.view ?? null : null,
    adoptGrammars,
    caption, connect, disconnect, error, events,
    isConnected: status === "connected" || status === "paused",
    isResponding, isUserSpeaking, lastToolCall, latency, micEnabled, remoteStream,
    resetSelected, status, stepSelected, toggleMic, tools,
  };
}
