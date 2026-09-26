"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  appendEvent,
  EMPTY_LATENCY,
  summarizeArgs,
  type AgentEvent,
  type AgentLatency,
} from "@/features/arrays-agent/lib/agent-activity";
import {
  appendMemory,
  buildLiveContext,
  frameLabel,
  type MemoryEntry,
} from "@/features/arrays-agent/lib/agent-memory";
import { useCountingPlayer } from "@/features/counting-agent/hooks/use-counting-player";
import {
  createInitialAgentState,
  describeAgentState,
  type CountingAgentState,
  type CountingFrame,
  type CountingOpResult,
} from "@/features/counting-agent/lib/counting-types";
import { createCountingTools } from "@/features/counting-agent/tools/counting";
import type {
  BlockControls,
  CountingOverlay,
  CountingToolContext,
  PresentationControls,
} from "@/features/counting-agent/tools/tool-context";
import {
  finishRealtimeUsageSession,
  trackRealtimeResponse,
} from "@/features/realtime/lib/realtime-usage-client";
import type { RealtimeUsageResponse } from "@/features/realtime/types/realtime-usage";
import { OpenAIRealtimeClient } from "@/lib/openai-realtime/realtime-client";
import type { RealtimeStatus } from "@/lib/openai-realtime/types";

export type CountingAgentOverlay = CountingOverlay & { id: string };

type UseCountingVoiceAgentArgs = {
  canvasId?: string | null;
  lessonTitle?: string;
  /** "audio" speaks aloud; "silent" drives the board without talking. */
  responseMode?: "audio" | "silent";
  initialTotal?: number;
  /** Mirror committed strip state somewhere else — the canvas document, a parent component's state. */
  onCommit?: (state: CountingAgentState) => void;
  /** Called when the agent clears the board. */
  onClear?: () => void;
  /** Frame navigation, when the agent is running inside a presentation. */
  presentation?: PresentationControls;
  /** Frame block editing, when running on a canvas. */
  blocks?: BlockControls;
};

const MAX_OVERLAYS = 3;

export function useCountingVoiceAgent({
  canvasId = null,
  lessonTitle,
  responseMode = "audio",
  initialTotal,
  onCommit,
  onClear,
  presentation,
  blocks,
}: UseCountingVoiceAgentArgs = {}) {
  const [status, setStatus] = useState<RealtimeStatus | "paused">("idle");
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [overlays, setOverlays] = useState<CountingAgentOverlay[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [latency, setLatency] = useState<AgentLatency>(EMPTY_LATENCY);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const player = useCountingPlayer();

  const logEvent = useCallback((event: AgentEvent) => {
    setEvents((previous) => appendEvent(previous, event));
  }, []);

  const speechEndedAtRef = useRef<number | null>(null);
  const responseSamplesRef = useRef<number[]>([]);

  const [initialState] = useState<CountingAgentState>(() => {
    const initial = createInitialAgentState(canvasId);
    if (initialTotal) initial.strip.total = initialTotal;
    return initial;
  });

  const stateRef = useRef<CountingAgentState>(initialState);
  const [snapshot, setSnapshot] = useState<CountingAgentState>(() => structuredClone(initialState));
  const bumpState = useCallback(() => setSnapshot(structuredClone(stateRef.current)), []);

  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const memoryRef = useRef<MemoryEntry[]>([]);
  const lastPlayedRef = useRef<{ frames: CountingFrame[]; summary: string } | null>(null);
  const contextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usageSessionIdRef = useRef<string | null>(null);
  const captionBufferRef = useRef("");
  const onCommitRef = useRef(onCommit);
  const onClearRef = useRef(onClear);
  const presentationRef = useRef(presentation);
  const blocksRef = useRef(blocks);

  useEffect(() => {
    onCommitRef.current = onCommit;
    onClearRef.current = onClear;
    presentationRef.current = presentation;
    blocksRef.current = blocks;
  }, [blocks, onClear, onCommit, presentation]);

  const pushLiveContext = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    client.replaceContext(
      "live",
      buildLiveContext({
        frame: presentationRef.current?.describe() ?? null,
        arrayState: describeAgentState(stateRef.current),
        memory: memoryRef.current,
      }),
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

  const remember = useCallback(
    (tool: string, ok: boolean, summary: string) => {
      memoryRef.current = appendMemory(memoryRef.current, {
        frame: frameLabel(presentationRef.current?.describe()),
        tool,
        ok,
        summary,
      });
      scheduleLiveContext();
    },
    [scheduleLiveContext],
  );

  const { afterSettle } = player.controls;
  const pushOverlay = useCallback(
    (overlay: CountingOverlay) => {
      afterSettle(() =>
        setOverlays((previous) => [...previous, { ...overlay, id: crypto.randomUUID() }].slice(-MAX_OVERLAYS)),
      );
    },
    [afterSettle],
  );

  const ctx = useMemo<CountingToolContext>(
    () => ({
      get state() {
        return stateRef.current;
      },
      get presentation() {
        return presentationRef.current;
      },
      get blocks() {
        return blocksRef.current;
      },
      play(result: CountingOpResult) {
        if (!result.rejected) {
          const final = result.frames[result.frames.length - 1];
          const strip = stateRef.current.strip;
          strip.id = strip.id ?? crypto.randomUUID();
          strip.total = final.total;
          strip.order = final.order;
          strip.mode = final.mode;
          strip.highlights = final.highlights;
          strip.division = final.division;
          strip.cursor = final.cursor ?? null;
          strip.accumulator = final.accumulator ?? null;
          strip.extracted = final.extracted ?? false;
          strip.view = final.view ?? "strip";
          strip.gridPage = final.gridPage ?? 0;
          bumpState();
        }
        if (!result.rejected && result.frames.length > 1) {
          lastPlayedRef.current = { frames: result.frames, summary: result.summary };
        }
        player.controls.play(
          result.frames,
          { speed: stateRef.current.teaching.speed },
          () => {
            onCommitRef.current?.(stateRef.current);
          },
        );
      },
      replayLast(speed) {
        const last = lastPlayedRef.current;
        if (!last) return { ok: false, message: "There is nothing to replay yet." };
        if (speed) {
          stateRef.current.teaching.speed = speed;
          bumpState();
        }
        const playbackSpeed = speed ?? stateRef.current.teaching.speed;
        player.controls.play(last.frames, { speed: playbackSpeed });
        const pace =
          playbackSpeed === "slow" ? "Replaying slowly" : playbackSpeed === "instant" ? "Showing the result" : "Replaying";
        return { ok: true, message: `${pace}: ${last.summary}` };
      },
      patch(partial) {
        const { teaching } = stateRef.current;
        if (partial.topic !== undefined) teaching.topic = partial.topic;
        if (partial.speed !== undefined) teaching.speed = partial.speed;
        bumpState();
      },
      overlay: pushOverlay,
      resetCanvas() {
        const strip = stateRef.current.strip;
        strip.highlights = [];
        strip.division = null;
        strip.cursor = null;
        strip.accumulator = null;
        strip.extracted = false;
        strip.view = "strip";
        strip.gridPage = 0;
        bumpState();
        setOverlays([]);
        player.controls.clear();
      },
      clearCanvas() {
        const strip = stateRef.current.strip;
        strip.id = null;
        strip.total = 0;
        strip.highlights = [];
        strip.division = null;
        strip.cursor = null;
        strip.accumulator = null;
        strip.extracted = false;
        strip.view = "strip";
        strip.gridPage = 0;
        bumpState();
        setOverlays([]);
        player.controls.clear();
        onClearRef.current?.();
      },
    }),
    [bumpState, player.controls, pushOverlay],
  );

  // eslint-disable-next-line react-hooks/refs
  const tools = useMemo(() => createCountingTools(ctx), [ctx]);

  const runTool = useCallback(
    async (name: string, argumentsJson: string): Promise<string> => {
      const tool = tools[name as keyof typeof tools] as
        | { execute?: (input: unknown, options: unknown) => unknown }
        | undefined;

      if (!tool?.execute) {
        return JSON.stringify({
          ok: false,
          error: `${name} is not a tool this agent has. Use one of the counting tools.`,
        });
      }

      let input: unknown;
      try {
        input = JSON.parse(argumentsJson || "{}");
      } catch {
        return JSON.stringify({ ok: false, error: "Arguments were not valid JSON." });
      }

      setLastToolCall(name);
      const startedAt = performance.now();
      try {
        const outcome = (await tool.execute(input, {})) as { ok?: boolean; summary?: string };
        const durationMs = performance.now() - startedAt;
        logEvent({
          kind: "tool",
          at: Date.now(),
          name,
          ok: outcome?.ok !== false,
          durationMs,
          summary: outcome?.summary ?? "",
          args: summarizeArgs(argumentsJson),
        });
        setLatency((previous) => ({
          ...previous,
          toolCalls: previous.toolCalls + 1,
          toolFailures: previous.toolFailures + (outcome?.ok === false ? 1 : 0),
          slowestToolMs: Math.max(previous.slowestToolMs ?? 0, durationMs),
        }));
        remember(name, outcome?.ok !== false, outcome?.summary ?? "");
        return JSON.stringify(outcome);
      } catch (thrown) {
        console.error(`[counting-agent] ${name} threw:`, thrown);
        logEvent({
          kind: "error",
          at: Date.now(),
          text: `${name} failed: ${thrown instanceof Error ? thrown.message : "unknown error"}`,
        });
        return JSON.stringify({
          ok: false,
          error: thrown instanceof Error ? thrown.message : `${name} failed.`,
          state: describeAgentState(stateRef.current),
        });
      }
    },
    [logEvent, remember, tools],
  );

  const disconnect = useCallback(() => {
    finishRealtimeUsageSession(usageSessionIdRef.current);
    usageSessionIdRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    if (contextTimerRef.current) {
      clearTimeout(contextTimerRef.current);
      contextTimerRef.current = null;
    }
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
      tokenEndpoint: "/api/openai/realtime/counting-agent",
      tokenBody: { canvasId, lessonTitle, responseMode },
      onUsageSessionCreated: (usageSessionId) => {
        usageSessionIdRef.current = usageSessionId;
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
      onUserTranscript: (text) => {
        logEvent({ kind: "heard", at: Date.now(), text });
      },
      onResponseCreated: () => {
        setIsResponding(true);
      },
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
        trackRealtimeResponse(usageSessionIdRef.current, response as RealtimeUsageResponse | undefined);
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
      onToolCallStart: (call) => {
        setLastToolCall(call.name);
      },
    });

    clientRef.current = client;
    await client.connect();
  }, [canvasId, lessonTitle, logEvent, pushLiveContext, responseMode, runTool, status]);

  const syncBoard = scheduleLiveContext;

  /**
   * Take over a strip that already exists on the board. Mirrors
   * `useArraysVoiceAgent`'s `adoptArray` — called when the class moves to a
   * frame, so the agent talks about the strip the teacher can SEE, not one it
   * remembers building. Passing null means the frame has no strip, and the
   * agent should know the board is genuinely empty rather than keep the
   * previous frame's strip.
   */
  const adoptStrip = useCallback(
    (
      adopted: {
        blockId: string;
        total: number;
        order: CountingAgentState["strip"]["order"];
        mode: CountingAgentState["strip"]["mode"];
        highlights: CountingAgentState["strip"]["highlights"];
        division: CountingAgentState["strip"]["division"];
      } | null,
    ) => {
      const strip = stateRef.current.strip;
      strip.id = adopted?.blockId ?? null;
      strip.total = adopted?.total ?? 0;
      strip.order = adopted?.order ?? "ascending";
      strip.mode = adopted?.mode ?? "list";
      strip.highlights = adopted ? [...adopted.highlights] : [];
      strip.division = adopted?.division ?? null;
      strip.cursor = null;
      strip.accumulator = null;
      strip.extracted = false;
      strip.view = "strip";
      strip.gridPage = 0;
      bumpState();
      player.controls.clear();
      setOverlays([]);
      syncBoard();
    },
    [bumpState, player.controls, syncBoard],
  );

  const setTotal = useCallback(
    (total: number) => {
      const strip = stateRef.current.strip;
      strip.total = total;
      bumpState();
      player.controls.clear();
      syncBoard();
    },
    [bumpState, player.controls, syncBoard],
  );

  const toggleMic = useCallback(() => {
    setMicEnabled((enabled) => {
      const next = !enabled;
      clientRef.current?.setMicrophoneEnabled(next);
      return next;
    });
  }, []);

  const speakNow = useCallback((instructions: string) => {
    return clientRef.current?.requestResponse(instructions) ?? false;
  }, []);

  const dismissOverlay = useCallback((id: string) => {
    setOverlays((previous) => previous.filter((overlay) => overlay.id !== id));
  }, []);

  const view: CountingFrame = useMemo(() => {
    if (player.frame) return player.frame;
    const { total, order, mode, highlights, division, cursor, accumulator, extracted, view, gridPage } = snapshot.strip;
    return { total, order, mode, highlights, division, cursor, accumulator, extracted, view, gridPage, note: "" };
  }, [player.frame, snapshot]);

  return {
    adoptStrip,
    agentState: snapshot,
    caption,
    connect,
    disconnect,
    dismissOverlay,
    error,
    events,
    isResponding,
    isUserSpeaking,
    latency,
    isAnimating: player.isPlaying,
    micEnabled,
    toggleMic,
    speakNow,
    animationNote: player.isPlaying ? (player.frame?.note ?? "") : "",
    animationProgress: player.progress,
    animationSpeed: snapshot.teaching.speed,
    skipAnimation: player.controls.skip,
    isConnected: status === "connected" || status === "paused",
    lastToolCall,
    overlays,
    remoteStream,
    setTotal,
    status,
    syncBoard,
    tools,
    view,
  };
}
