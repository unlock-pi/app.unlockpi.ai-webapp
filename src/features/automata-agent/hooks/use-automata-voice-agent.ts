"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Automaton } from "@/components/automata/model";
import {
  appendEvent,
  EMPTY_LATENCY,
  summarizeArgs,
  type AgentEvent,
  type AgentLatency,
} from "@/features/arrays-agent/lib/agent-activity";
import { buildAutomataLiveContext } from "@/features/automata-agent/lib/agent-context";
import {
  createInitialAutomataState,
  putAutomaton,
  selectedAutomaton,
  type AutomataAgentState,
} from "@/features/automata-agent/lib/automaton-engine";
import type { FrameAutomatonSnapshot } from "@/features/automata-agent/hooks/use-automata-canvas-bridge";
import { createAutomataTools } from "@/features/automata-agent/tools/automata";
import type {
  AutomataCommit,
  AutomataToolContext,
} from "@/features/automata-agent/tools/tool-context";
import {
  finishRealtimeUsageSession,
  trackRealtimeResponse,
} from "@/features/realtime/lib/realtime-usage-client";
import type { RealtimeUsageResponse } from "@/features/realtime/types/realtime-usage";
import { OpenAIRealtimeClient } from "@/lib/openai-realtime/realtime-client";
import type { RealtimeStatus } from "@/lib/openai-realtime/types";

type Args = {
  canvasId?: string | null;
  lessonTitle?: string;
  responseMode?: "audio" | "silent";
  onCreate?: (automaton: Automaton, input: string) => void;
  onDefinitionChange?: (automaton: Automaton, input: string) => void;
  onSelectionChange?: (automatonId: string | null) => void;
};

export function useAutomataVoiceAgent({
  canvasId = null,
  lessonTitle,
  responseMode = "audio",
  onCreate,
  onDefinitionChange,
  onSelectionChange,
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

  const [initialState] = useState(() => createInitialAutomataState(canvasId));
  const stateRef = useRef<AutomataAgentState>(initialState);
  const [snapshot, setSnapshot] = useState(() => structuredClone(initialState));
  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const usageSessionIdRef = useRef<string | null>(null);
  const contextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionBufferRef = useRef("");
  const speechEndedAtRef = useRef<number | null>(null);
  const responseSamplesRef = useRef<number[]>([]);
  const onCreateRef = useRef(onCreate);
  const onDefinitionChangeRef = useRef(onDefinitionChange);
  const onSelectionChangeRef = useRef(onSelectionChange);

  useEffect(() => {
    onCreateRef.current = onCreate;
    onDefinitionChangeRef.current = onDefinitionChange;
    onSelectionChangeRef.current = onSelectionChange;
  }, [onCreate, onDefinitionChange, onSelectionChange]);

  const logEvent = useCallback((event: AgentEvent) => {
    setEvents((previous) => appendEvent(previous, event));
  }, []);

  const pushLiveContext = useCallback(() => {
    clientRef.current?.replaceContext("live", buildAutomataLiveContext(stateRef.current));
  }, []);

  const scheduleLiveContext = useCallback(() => {
    if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
    contextTimerRef.current = setTimeout(() => {
      contextTimerRef.current = null;
      pushLiveContext();
    }, 150);
  }, [pushLiveContext]);

  useEffect(
    () => () => {
      if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
    },
    [],
  );

  const ctx = useMemo<AutomataToolContext>(
    () => ({
      get state() {
        return stateRef.current;
      },
      commit(next, change?: AutomataCommit) {
        const previousSelected = stateRef.current.selectedAutomatonId;
        stateRef.current = structuredClone(next);
        setSnapshot(structuredClone(next));
        const selectedId = next.selectedAutomatonId;
        const input = selectedId ? next.executions[selectedId]?.input ?? "" : "";
        if (change?.created) onCreateRef.current?.(change.created, input);
        if (change?.definitionChanged) {
          onDefinitionChangeRef.current?.(change.definitionChanged, input);
        }
        if (selectedId !== previousSelected || change?.created) {
          onSelectionChangeRef.current?.(selectedId);
        }
        scheduleLiveContext();
      },
    }),
    [scheduleLiveContext],
  );

  // The getter is intentionally evaluated only when a tool executes.
  // eslint-disable-next-line react-hooks/refs
  const tools = useMemo(() => createAutomataTools(ctx), [ctx]);

  const runTool = useCallback(
    async (name: string, argumentsJson: string) => {
      const definition = tools[name as keyof typeof tools] as
        | { execute?: (input: unknown, options: unknown) => unknown }
        | undefined;
      if (!definition?.execute) {
        return JSON.stringify({
          success: false,
          ok: false,
          error: {
            code: "INVALID_OPERATION",
            message: `${name} is not one of the ten automata tools.`,
          },
        });
      }
      let input: unknown;
      try {
        input = JSON.parse(argumentsJson || "{}");
      } catch {
        return JSON.stringify({
          success: false,
          ok: false,
          error: { code: "INVALID_OPERATION", message: "Arguments were not valid JSON." },
        });
      }
      setLastToolCall(name);
      const startedAt = performance.now();
      try {
        const outcome = await definition.execute(input, {}) as {
          ok?: boolean;
          summary?: string;
        };
        const durationMs = performance.now() - startedAt;
        logEvent({
          kind: "tool",
          at: Date.now(),
          name,
          ok: outcome.ok !== false,
          durationMs,
          summary: outcome.summary ?? "",
          args: summarizeArgs(argumentsJson),
        });
        setLatency((previous) => ({
          ...previous,
          toolCalls: previous.toolCalls + 1,
          toolFailures: previous.toolFailures + (outcome.ok === false ? 1 : 0),
          slowestToolMs: Math.max(previous.slowestToolMs ?? 0, durationMs),
        }));
        return JSON.stringify(outcome);
      } catch (thrown) {
        const message = thrown instanceof Error ? thrown.message : `${name} failed.`;
        console.error(`[automata-agent] ${name} threw:`, thrown);
        logEvent({ kind: "error", at: Date.now(), text: message });
        return JSON.stringify({
          success: false,
          ok: false,
          error: { code: "INVALID_OPERATION", message },
        });
      }
    },
    [logEvent, tools],
  );

  const disconnect = useCallback(() => {
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
  }, []);

  useEffect(() => disconnect, [disconnect]);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected" || status === "paused") return;
    setError(null);
    const client = new OpenAIRealtimeClient({
      tokenEndpoint: "/api/openai/realtime/automata-agent",
      tokenBody: { canvasId, lessonTitle, responseMode },
      onUsageSessionCreated: (id) => {
        usageSessionIdRef.current = id;
      },
      onToolCall: (call) => runTool(call.name, call.argumentsJson),
      onStatusChange: (next) => {
        setStatus(next);
        logEvent({ kind: "status", at: Date.now(), text: next });
        if (next === "connected") pushLiveContext();
      },
      onServerError: (message, code) => {
        logEvent({ kind: "error", at: Date.now(), text: code ? `${message} (${code})` : message });
      },
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
        setLatency((previous) => ({
          ...previous,
          responseMs,
          averageResponseMs: samples.reduce((total, value) => total + value, 0) / samples.length,
        }));
        logEvent({ kind: "thinking", at: Date.now(), latencyMs: responseMs });
      },
      onResponseDone: (response) => {
        setIsResponding(false);
        const spoken = captionBufferRef.current.trim();
        if (spoken) logEvent({ kind: "said", at: Date.now(), text: spoken });
        captionBufferRef.current = "";
        trackRealtimeResponse(
          usageSessionIdRef.current,
          response as RealtimeUsageResponse | undefined,
        );
      },
      onSpeechStarted: () => {
        setIsUserSpeaking(true);
        captionBufferRef.current = "";
        setCaption("");
      },
      onSpeechStopped: () => {
        setIsUserSpeaking(false);
        speechEndedAtRef.current = performance.now();
      },
      onToolCallStart: (call) => setLastToolCall(call.name),
    });
    clientRef.current = client;
    await client.connect();
  }, [canvasId, lessonTitle, logEvent, pushLiveContext, responseMode, runTool, status]);

  const adoptAutomata = useCallback(
    (snapshots: FrameAutomatonSnapshot[]) => {
      let next = createInitialAutomataState(canvasId);
      for (const snapshot of snapshots) {
        next = putAutomaton(next, snapshot.automaton, snapshot.input);
      }
      next.selectedAutomatonId = snapshots[0]?.automaton.id ?? null;
      stateRef.current = next;
      setSnapshot(structuredClone(next));
      onSelectionChangeRef.current?.(next.selectedAutomatonId);
      scheduleLiveContext();
    },
    [canvasId, scheduleLiveContext],
  );

  const toggleMic = useCallback(() => {
    setMicEnabled((enabled) => {
      const next = !enabled;
      clientRef.current?.setMicrophoneEnabled(next);
      return next;
    });
  }, []);

  const runDirect = useCallback(
    async (toolName: "step_execution" | "reset_execution") => {
      const definition = tools[toolName] as unknown as {
        execute: (input: unknown, options: unknown) => Promise<unknown>;
      };
      await definition.execute({}, {});
    },
    [tools],
  );

  const automaton = selectedAutomaton(snapshot);
  const execution = automaton ? snapshot.executions[automaton.id] ?? null : null;

  return {
    agentState: snapshot,
    automaton,
    execution,
    adoptAutomata,
    caption,
    connect,
    disconnect,
    error,
    events,
    isConnected: status === "connected" || status === "paused",
    isResponding,
    isUserSpeaking,
    lastToolCall,
    latency,
    micEnabled,
    remoteStream,
    resetSelected: () => void runDirect("reset_execution"),
    stepSelected: () => void runDirect("step_execution"),
    status,
    toggleMic,
    tools,
  };
}
