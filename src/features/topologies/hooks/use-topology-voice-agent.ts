"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useTopologyPlayer } from "@/features/topologies/hooks/use-topology-player";
import { appendMemory, buildLiveContext, type MemoryEntry } from "@/features/topologies/lib/topology-memory";
import {
  createInitialAgentState,
  describeAgentState,
  type TopologyAgentState,
  type TopologyFrame,
  type TopologyOpResult,
} from "@/features/topologies/lib/topology-types";
import { clearScene } from "@/features/topologies/operations/topology-scene-ops";
import { createTopologyTools } from "@/features/topologies/tools/topology";
import type { BlockControls, TopologyOverlay, TopologyToolContext } from "@/features/topologies/tools/tool-context";
import type { TopoScene } from "@/features/topologies/lib/topology-kit";
import {
  finishRealtimeUsageSession,
  trackRealtimeResponse,
} from "@/features/realtime/lib/realtime-usage-client";
import type { RealtimeUsageResponse } from "@/features/realtime/types/realtime-usage";
import { OpenAIRealtimeClient } from "@/lib/openai-realtime/realtime-client";
import type { RealtimeStatus } from "@/lib/openai-realtime/types";

export type TopologyAgentOverlay = TopologyOverlay & { id: string };

type UseTopologyVoiceAgentArgs = {
  canvasId?: string | null;
  lessonTitle?: string;
  /** "audio" speaks aloud; "silent" drives the board without talking. */
  responseMode?: "audio" | "silent";
  /** Mirror the settled diagram somewhere else, e.g. a canvas document. Called after every change. */
  onCommit?: (state: TopologyAgentState) => void;
  /** Editing the frame's own text blocks, when running on a canvas. */
  blocks?: BlockControls;
};

/** How many overlays stay on the board before the oldest is dropped. */
const MAX_OVERLAYS = 3;

export function useTopologyVoiceAgent({
  canvasId = null,
  lessonTitle,
  responseMode = "audio",
  onCommit,
  blocks,
}: UseTopologyVoiceAgentArgs = {}) {
  const [status, setStatus] = useState<RealtimeStatus | "paused">("idle");
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [overlays, setOverlays] = useState<TopologyAgentOverlay[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const player = useTopologyPlayer();

  const [initialState] = useState<TopologyAgentState>(() => createInitialAgentState(canvasId));
  /** THE authoritative state. A ref rather than useState so bursts of tool calls each see the previous one's result immediately. */
  const stateRef = useRef<TopologyAgentState>(initialState);
  /** An immutable copy of the ref, republished after every mutation, for components to render from. */
  const [snapshot, setSnapshot] = useState<TopologyAgentState>(() => structuredClone(initialState));
  const bumpState = useCallback(() => setSnapshot(structuredClone(stateRef.current)), []);

  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const memoryRef = useRef<MemoryEntry[]>([]);
  const contextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usageSessionIdRef = useRef<string | null>(null);
  const captionBufferRef = useRef("");
  const onCommitRef = useRef(onCommit);
  const blocksRef = useRef(blocks);

  useEffect(() => {
    onCommitRef.current = onCommit;
    blocksRef.current = blocks;
  }, [onCommit, blocks]);

  // ── Context window ───────────────────────────────────────────────────
  const pushLiveContext = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    client.replaceContext(
      "live",
      buildLiveContext({ boardState: describeAgentState(stateRef.current), memory: memoryRef.current }),
    );
  }, []);

  /** Coalesce bursts — placing three devices in a row should refresh context once, not three times. */
  const scheduleLiveContext = useCallback(() => {
    if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
    contextTimerRef.current = setTimeout(() => {
      contextTimerRef.current = null;
      pushLiveContext();
    }, 150);
  }, [pushLiveContext]);

  useEffect(() => () => {
    if (contextTimerRef.current) clearTimeout(contextTimerRef.current);
  }, []);

  const remember = useCallback(
    (tool: string, ok: boolean, summary: string) => {
      memoryRef.current = appendMemory(memoryRef.current, { tool, ok, summary });
      scheduleLiveContext();
    },
    [scheduleLiveContext],
  );

  const { afterSettle } = player.controls;
  const pushOverlay = useCallback(
    (overlay: TopologyOverlay) => {
      afterSettle(() =>
        setOverlays((previous) => [...previous, { ...overlay, id: crypto.randomUUID() }].slice(-MAX_OVERLAYS)),
      );
    },
    [afterSettle],
  );

  // ── The tool context ─────────────────────────────────────────────────
  const ctx = useMemo<TopologyToolContext>(
    () => ({
      get state() {
        return stateRef.current;
      },
      get blocks() {
        return blocksRef.current;
      },
      play(result: TopologyOpResult) {
        if (!result.rejected) {
          stateRef.current.scene = result.scene;
          bumpState();
        }
        player.controls.play(result.frames, {}, () => {
          onCommitRef.current?.(stateRef.current);
        });
      },
      patch(partial) {
        if (partial.selected !== undefined) stateRef.current.scene.selected = partial.selected;
        if (partial.presetName !== undefined) stateRef.current.presetName = partial.presetName;
        if (partial.packetsAnimating !== undefined) stateRef.current.packetsAnimating = partial.packetsAnimating;
        bumpState();
      },
      overlay: pushOverlay,
      resetCanvas() {
        stateRef.current.scene.selected = null;
        bumpState();
        setOverlays([]);
      },
      clearCanvas() {
        const result = clearScene();
        stateRef.current.scene = result.scene;
        stateRef.current.presetName = null;
        stateRef.current.packetsAnimating = false;
        bumpState();
        setOverlays([]);
        player.controls.play(result.frames, { speed: "instant" });
        onCommitRef.current?.(stateRef.current);
      },
    }),
    // `player.controls` — not `player` — so an animation beat does not
    // rebuild the context and, with it, every tool.
    [bumpState, player.controls, pushOverlay],
  );

  // eslint-disable-next-line react-hooks/refs
  const tools = useMemo(() => createTopologyTools(ctx), [ctx]);

  // ── Dispatch ─────────────────────────────────────────────────────────
  const runTool = useCallback(
    async (name: string, argumentsJson: string): Promise<string> => {
      const tool = tools[name as keyof typeof tools] as
        | { execute?: (input: unknown, options: unknown) => unknown }
        | undefined;

      if (!tool?.execute) {
        return JSON.stringify({ ok: false, error: `${name} is not a tool this agent has.` });
      }

      let input: unknown;
      try {
        input = JSON.parse(argumentsJson || "{}");
      } catch {
        return JSON.stringify({ ok: false, error: "Arguments were not valid JSON." });
      }

      setLastToolCall(name);
      try {
        const outcome = (await tool.execute(input, {})) as { ok?: boolean; summary?: string };
        remember(name, outcome?.ok !== false, outcome?.summary ?? "");
        return JSON.stringify(outcome);
      } catch (thrown) {
        console.error(`[topology-agent] ${name} threw:`, thrown);
        return JSON.stringify({
          ok: false,
          error: thrown instanceof Error ? thrown.message : `${name} failed.`,
          state: describeAgentState(stateRef.current),
        });
      }
    },
    [remember, tools],
  );

  // ── Session lifecycle ────────────────────────────────────────────────
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
      tokenEndpoint: "/api/openai/realtime/topology-agent",
      tokenBody: { canvasId, lessonTitle, responseMode },
      onUsageSessionCreated: (usageSessionId) => {
        usageSessionIdRef.current = usageSessionId;
      },
      onToolCall: (call) => runTool(call.name, call.argumentsJson),
      onStatusChange: (next) => {
        setStatus(next);
        if (next === "connected") pushLiveContext();
      },
      onServerError: () => {},
      onError: (message) => {
        finishRealtimeUsageSession(usageSessionIdRef.current, "failed");
        usageSessionIdRef.current = null;
        setError(message);
      },
      onRemoteStream: setRemoteStream,
      onTranscriptDelta: (delta) => {
        captionBufferRef.current += delta;
        setCaption(captionBufferRef.current);
      },
      onResponseCreated: () => setIsResponding(true),
      onResponseDone: (response) => {
        setIsResponding(false);
        captionBufferRef.current = "";
        trackRealtimeResponse(usageSessionIdRef.current, response as RealtimeUsageResponse | undefined);
      },
      onSpeechStarted: () => {
        setIsUserSpeaking(true);
        captionBufferRef.current = "";
        setCaption("");
      },
      onSpeechStopped: () => setIsUserSpeaking(false),
      onToolCallStart: (call) => setLastToolCall(call.name),
    });

    clientRef.current = client;
    await client.connect();
  }, [canvasId, lessonTitle, pushLiveContext, responseMode, runTool, status]);

  /** Push the current board into the model's context without making it speak. */
  const syncBoard = scheduleLiveContext;

  /** Mute or unmute the teacher's microphone without ending the session. */
  const toggleMic = useCallback(() => {
    setMicEnabled((enabled) => {
      const next = !enabled;
      clientRef.current?.setMicrophoneEnabled(next);
      return next;
    });
  }, []);

  const speakNow = useCallback((instructions: string) => clientRef.current?.requestResponse(instructions) ?? false, []);

  const dismissOverlay = useCallback((id: string) => {
    setOverlays((previous) => previous.filter((overlay) => overlay.id !== id));
  }, []);

  /** A click on the board itself, rather than a tool call — used by the board's own onSelect. */
  const selectDevice = useCallback(
    (id: string) => {
      stateRef.current.scene.selected = id;
      bumpState();
    },
    [bumpState],
  );

  /**
   * Take over a topology that already exists on the canvas frame the class
   * moved to — mirrors `adoptArray`/`adoptStrip`. `null` means the frame
   * genuinely has none, and Mesh should know the board is empty rather than
   * keep whatever the previous frame showed.
   */
  const adoptScene = useCallback(
    (adopted: TopoScene | null) => {
      stateRef.current.scene = adopted ?? { w: 8, d: 8, zones: [], nodes: [], links: [], selected: null };
      stateRef.current.presetName = null;
      stateRef.current.packetsAnimating = false;
      bumpState();
      player.controls.clear();
      setOverlays([]);
      syncBoard();
    },
    [bumpState, player.controls, syncBoard],
  );

  // ── What the UI renders ──────────────────────────────────────────────
  const view: TopologyFrame = useMemo(() => {
    if (player.frame) return player.frame;
    return { scene: snapshot.scene, note: "" };
  }, [player.frame, snapshot]);

  return {
    /** Immutable snapshot — safe to read in render and to use as a dependency. */
    agentState: snapshot,
    adoptScene,
    caption,
    connect,
    disconnect,
    dismissOverlay,
    error,
    isResponding,
    isUserSpeaking,
    isAnimating: player.isPlaying,
    micEnabled,
    toggleMic,
    speakNow,
    animationProgress: player.progress,
    skipAnimation: player.controls.skip,
    isConnected: status === "connected" || status === "paused",
    lastToolCall,
    overlays,
    remoteStream,
    selectDevice,
    status,
    syncBoard,
    /** Direct tool access, for demo buttons and tests. */
    tools,
    view,
  };
}
