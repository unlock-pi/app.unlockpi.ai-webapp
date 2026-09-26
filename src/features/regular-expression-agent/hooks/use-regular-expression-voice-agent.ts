"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { PlaybackCoordinator } from "@/features/regular-expression-agent/lib/playback-coordinator";

import {
  appendEvent,
  EMPTY_LATENCY,
  summarizeArgs,
  type AgentEvent,
  type AgentLatency,
} from "@/features/arrays-agent/lib/agent-activity";
import type { RegularExpressionDisplayMode } from "@/components/regular-expression/types";
import { buildRegularExpressionLiveContext } from "@/features/regular-expression-agent/lib/agent-context";
import {
  createInitialRegularExpressionAgentState,
  replaceRegularExpression,
  type RegularExpressionAgentState,
} from "@/features/regular-expression-agent/lib/agent-state";
import type { FrameRegularExpressionSnapshot } from "@/features/regular-expression-agent/hooks/use-regular-expression-canvas-bridge";
import { createRegularExpressionTools } from "@/features/regular-expression-agent/tools/regular-expression";
import type {
  RegularExpressionCommit,
  RegularExpressionToolContext,
} from "@/features/regular-expression-agent/tools/tool-context";
import { parseRegularExpression } from "@/features/regular-expression/parser";
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
  onExpressionChange?: (expression: string, input: string) => void;
};

export function useRegularExpressionVoiceAgent({
  canvasId = null,
  lessonTitle,
  responseMode = "audio",
  onExpressionChange,
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

  const [initialState] = useState(() =>
    createInitialRegularExpressionAgentState(canvasId),
  );
  const stateRef = useRef<RegularExpressionAgentState>(initialState);
  const [snapshot, setSnapshot] = useState(() => structuredClone(initialState));
  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const [playback] = useState(() => new PlaybackCoordinator());
  const usageSessionIdRef = useRef<string | null>(null);
  const contextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionBufferRef = useRef("");
  const speechEndedAtRef = useRef<number | null>(null);
  const responseSamplesRef = useRef<number[]>([]);
  const onExpressionChangeRef = useRef(onExpressionChange);

  useEffect(() => {
    onExpressionChangeRef.current = onExpressionChange;
  }, [onExpressionChange]);

  const logEvent = useCallback((event: AgentEvent) => {
    setEvents((previous) => appendEvent(previous, event));
  }, []);

  const pushLiveContext = useCallback(() => {
    clientRef.current?.replaceContext(
      "live",
      buildRegularExpressionLiveContext(stateRef.current),
    );
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

  const ctx = useMemo<RegularExpressionToolContext>(
    () => ({
      get state() {
        return stateRef.current;
      },
      commit(next, change?: RegularExpressionCommit) {
        stateRef.current = structuredClone(next);
        setSnapshot(structuredClone(next));
        if (change?.expressionChanged) {
          onExpressionChangeRef.current?.(
            change.expressionChanged.expression,
            change.expressionChanged.input,
          );
        }
        scheduleLiveContext();
      },
    }),
    [scheduleLiveContext],
  );

  // The getter is intentionally evaluated only when a tool executes.
  const tools = useMemo(() => createRegularExpressionTools(ctx), [ctx]);

  const onPlaybackComplete = useCallback(
    (executionId: string, stepCount: number) => playback.report(executionId, stepCount),
    [playback],
  );

  const executeWithPlayback = useCallback(
    async (execute: () => Promise<unknown> | unknown) => playback.run(async () => {
      const before = stateRef.current.view.generatedAutomatonExecution;
      const outcome = await execute();
      const after = stateRef.current.view.generatedAutomatonExecution;
      if (after && after.steps.length && (
        after.executionId !== before?.executionId ||
        after.steps.length > (before?.steps.length ?? 0)
      )) {
        await playback.wait(after.executionId, after.steps.length);
      }
      return outcome;
    }),
    [playback],
  );

  const runTool = useCallback(
    async (name: string, argumentsJson: string) => {
      const definition = tools[name as keyof typeof tools] as
        | {
            execute?: (input: unknown, options: unknown) => unknown;
            inputSchema?: unknown;
          }
        | undefined;
      if (!definition?.execute) {
        return JSON.stringify({
          success: false,
          ok: false,
          error: {
            code: "INVALID_OPERATION",
            message: `${name} is not one of the eighteen regular-expression tools.`,
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
          error: {
            code: "INVALID_OPERATION",
            message: "Arguments were not valid JSON.",
          },
        });
      }

      if (definition.inputSchema instanceof z.ZodType) {
        const validation = definition.inputSchema.safeParse(input);
        if (!validation.success) {
          return JSON.stringify({
            success: false,
            ok: false,
            error: {
              code: "INVALID_TOOL_INPUT",
              message: "Tool arguments did not match the registered schema.",
              details: z.flattenError(validation.error),
            },
          });
        }
        input = validation.data;
      }

      setLastToolCall(name);
      const startedAt = performance.now();
      try {
        const outcome = (await executeWithPlayback(() => definition.execute!(input, {}))) as {
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
        const message =
          thrown instanceof Error ? thrown.message : `${name} failed.`;
        console.error(`[regular-expression-agent] ${name} threw:`, thrown);
        logEvent({ kind: "error", at: Date.now(), text: message });
        return JSON.stringify({
          success: false,
          ok: false,
          error: { code: "INVALID_OPERATION", message },
        });
      }
    },
    [executeWithPlayback, logEvent, tools],
  );

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
    if (
      status === "connecting" ||
      status === "connected" ||
      status === "paused"
    ) {
      return;
    }

    setError(null);
    const client = new OpenAIRealtimeClient({
      tokenEndpoint: "/api/openai/realtime/regular-expression-agent",
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
        logEvent({
          kind: "error",
          at: Date.now(),
          text: code ? `${message} (${code})` : message,
        });
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
      onUserTranscript: (text) =>
        logEvent({ kind: "heard", at: Date.now(), text }),
      onResponseCreated: () => setIsResponding(true),
      onFirstOutput: () => {
        const startedAt = speechEndedAtRef.current;
        if (startedAt === null) return;
        const responseMs = performance.now() - startedAt;
        speechEndedAtRef.current = null;
        responseSamplesRef.current = [
          ...responseSamplesRef.current,
          responseMs,
        ].slice(-20);
        const samples = responseSamplesRef.current;
        setLatency((previous) => ({
          ...previous,
          responseMs,
          averageResponseMs:
            samples.reduce((total, value) => total + value, 0) / samples.length,
        }));
        logEvent({ kind: "thinking", at: Date.now(), latencyMs: responseMs });
      },
      onResponseDone: (response) => {
        setIsResponding(false);
        const spoken = captionBufferRef.current.trim();
        if (spoken) {
          logEvent({ kind: "said", at: Date.now(), text: spoken });
        }
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
  }, [
    canvasId,
    lessonTitle,
    logEvent,
    pushLiveContext,
    responseMode,
    runTool,
    status,
  ]);

  const adoptRegularExpressions = useCallback(
    (snapshots: FrameRegularExpressionSnapshot[]) => {
      playback.cancel();
      const selected = snapshots.at(-1);
      let next = createInitialRegularExpressionAgentState(canvasId);
      if (selected) {
        const parsed = parseRegularExpression(selected.props.expression);
        if (parsed.ok) {
          next = replaceRegularExpression(next, parsed.value);
          next.view.input = selected.props.input;
          next.view.inputSymbols = [...selected.props.input];
          next.view.displayMode = selected.props.displayMode;
        } else {
          next.view.expression = selected.props.expression;
          next.view.input = selected.props.input;
        }
      }
      stateRef.current = next;
      setSnapshot(structuredClone(next));
      scheduleLiveContext();
    },
    [canvasId, playback, scheduleLiveContext],
  );

  const toggleMic = useCallback(() => {
    setMicEnabled((enabled) => {
      const next = !enabled;
      clientRef.current?.setMicrophoneEnabled(next);
      return next;
    });
  }, []);

  const runDirect = useCallback(
    async (
      toolName: keyof typeof tools,
      input: Record<string, unknown> = {},
    ) => {
      const definition = tools[toolName] as unknown as {
        execute: (value: unknown, options: unknown) => Promise<unknown>;
      };
      try {
        await executeWithPlayback(() => definition.execute(input, {}));
      } catch (error) {
        if (!(error instanceof Error && error.message === "Playback was cancelled.")) {
          setError(error instanceof Error ? error.message : "Playback failed.");
        }
      }
    },
    [executeWithPlayback, tools],
  );

  const stepSelected = useCallback(() => {
    const state = stateRef.current;
    if (
      state.view.displayMode === "construction" &&
      state.construction &&
      state.constructionVersion === state.expressionVersion
    ) {
      const nextStep = Math.min(
        (state.view.currentConstructionStep ?? 0) + 2,
        state.construction.trace.length,
      );
      if (nextStep <= (state.view.currentConstructionStep ?? 0) + 1) return;
      void runDirect("show_construction_step", { step: nextStep });
      return;
    }
    if (
      state.view.conversionPlaybackActive &&
      state.conversion &&
      state.conversionVersion === state.expressionVersion
    ) {
      const nextStep = Math.min(
        state.view.conversionStepCount
          ? (state.view.currentConversionStep ?? 0) + 2
          : 1,
        state.conversion.trace.length,
      );
      if (
        nextStep < 1 ||
        ((state.view.conversionStepCount ?? 0) > 0 &&
          nextStep <= (state.view.currentConversionStep ?? 0) + 1)
      ) return;
      void runDirect("show_conversion_step", { step: nextStep });
      return;
    }
    void runDirect("step_execution");
  }, [runDirect]);

  const resetSelected = useCallback(() => {
    playback.cancel();
    const state = stateRef.current;
    if (
      state.view.displayMode === "construction" &&
      state.construction &&
      state.constructionVersion === state.expressionVersion
    ) {
      void runDirect("reset_construction");
      return;
    }
    if (
      state.view.conversionPlaybackActive &&
      state.conversion &&
      state.conversionVersion === state.expressionVersion
    ) {
      void runDirect("reset_conversion");
      return;
    }
    void runDirect("reset_execution");
  }, [playback, runDirect]);

  const setDisplayMode = useCallback(
    (displayMode: RegularExpressionDisplayMode) => {
      const next = structuredClone(stateRef.current);
      next.view.displayMode = displayMode;
      ctx.commit(next);
    },
    [ctx],
  );

  return {
    onPlaybackComplete,
    agentState: snapshot,
    view: snapshot.view,
    adoptRegularExpressions,
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
    resetSelected,
    setDisplayMode,
    status,
    stepSelected,
    toggleMic,
    tools,
  };
}
