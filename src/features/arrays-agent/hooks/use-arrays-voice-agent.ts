"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useArrayPlayer } from "@/features/arrays-agent/hooks/use-array-player";
import { toDisplayValues } from "@/features/arrays-agent/lib/array-frames";
import {
  createInitialAgentState,
  describeAgentState,
  type ArrayAgentState,
  type ArrayFrame,
  type ArrayOpResult,
  type ArrayValue,
} from "@/features/arrays-agent/lib/array-types";
import { createArrayTools } from "@/features/arrays-agent/tools/array";
import type {
  ArrayOverlay,
  ArrayToolContext,
  PresentationControls,
} from "@/features/arrays-agent/tools/tool-context";
import {
  finishRealtimeUsageSession,
  trackRealtimeResponse,
} from "@/features/realtime/lib/realtime-usage-client";
import type { RealtimeUsageResponse } from "@/features/realtime/types/realtime-usage";
import { OpenAIRealtimeClient } from "@/lib/openai-realtime/realtime-client";
import type { RealtimeStatus } from "@/lib/openai-realtime/types";

export type ArraysAgentOverlay = ArrayOverlay & { id: string };

type UseArraysVoiceAgentArgs = {
  canvasId?: string | null;
  lessonTitle?: string;
  /** "audio" speaks aloud; "silent" drives the board without talking. */
  responseMode?: "audio" | "silent";
  initialValues?: Array<string | number>;
  /**
   * Mirror committed array state somewhere else — the canvas document, a
   * parent component's state. Called after every change, with the settled
   * values rather than every animation beat.
   */
  onCommit?: (values: ArrayValue[], state: ArrayAgentState) => void;
  /**
   * Called when the agent needs somewhere to put an array — the host is
   * responsible for making a place for it (on the canvas, that means adding a
   * frame when the current one is full).
   */
  onEnsureArray?: (values: ArrayValue[], name: string) => void;
  /** Called when the agent clears the board. */
  onClear?: () => void;
  /**
   * Frame navigation, when the agent is running inside a presentation. Omit
   * on surfaces that have no frames.
   */
  presentation?: PresentationControls;
};

/** How many overlays stay on the board before the oldest is dropped. */
const MAX_OVERLAYS = 3;

export function useArraysVoiceAgent({
  canvasId = null,
  lessonTitle,
  responseMode = "audio",
  initialValues = [],
  onCommit,
  onEnsureArray,
  onClear,
  presentation,
}: UseArraysVoiceAgentArgs = {}) {
  const [status, setStatus] = useState<RealtimeStatus | "paused">("idle");
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [overlays, setOverlays] = useState<ArraysAgentOverlay[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const player = useArrayPlayer();

  // Built once, then handed to both the ref and the first snapshot so neither
  // has to read the other during render.
  const [initialState] = useState<ArrayAgentState>(() => {
    const initial = createInitialAgentState(canvasId);
    initial.array.values = toDisplayValues(initialValues);
    initial.array.dimensions = [initial.array.values.length];
    return initial;
  });

  /**
   * THE authoritative state. A ref rather than useState because tool calls
   * arrive in bursts — create then insert then explain — and each must see the
   * previous one's result immediately, not after React has re-rendered.
   */
  const stateRef = useRef<ArrayAgentState>(initialState);

  /**
   * An immutable copy of the ref, republished after every mutation.
   *
   * Consumers render from this rather than the ref: handing out the mutable
   * object would let a component read values React has no way of knowing
   * changed, and it would be unusable as a hook dependency.
   */
  const [snapshot, setSnapshot] = useState<ArrayAgentState>(() =>
    structuredClone(initialState),
  );
  const bumpState = useCallback(
    () => setSnapshot(structuredClone(stateRef.current)),
    [],
  );

  const clientRef = useRef<OpenAIRealtimeClient | null>(null);
  const usageSessionIdRef = useRef<string | null>(null);
  const captionBufferRef = useRef("");
  const onCommitRef = useRef(onCommit);
  const onEnsureArrayRef = useRef(onEnsureArray);
  const onClearRef = useRef(onClear);
  const presentationRef = useRef(presentation);

  useEffect(() => {
    onCommitRef.current = onCommit;
    onEnsureArrayRef.current = onEnsureArray;
    onClearRef.current = onClear;
    presentationRef.current = presentation;
  }, [onClear, onCommit, onEnsureArray, presentation]);

  const pushOverlay = useCallback((overlay: ArrayOverlay) => {
    setOverlays((previous) =>
      [...previous, { ...overlay, id: crypto.randomUUID() }].slice(-MAX_OVERLAYS),
    );
  }, []);

  // ── The tool context ─────────────────────────────────────────────────
  // Built once. `state` is a getter over the ref, so the tools always read
  // current truth without the context itself ever going stale.
  const ctx = useMemo<ArrayToolContext>(
    () => ({
      get state() {
        return stateRef.current;
      },
      // A getter for the same reason `state` is one: the host can hand over
      // navigation after the context was built, and the tools must see it.
      get presentation() {
        return presentationRef.current;
      },
      play(result: ArrayOpResult) {
        if (!result.rejected) {
          const array = stateRef.current.array;
          array.values = [...result.values];
          array.id = array.id ?? crypto.randomUUID();
          if (array.dimensions.length === 1) array.dimensions = [result.values.length];
          bumpState();
        }
        player.controls.play(result.frames, () => {
          onCommitRef.current?.(stateRef.current.array.values, stateRef.current);
        });
      },
      ensureArray(values, name) {
        const array = stateRef.current.array;
        array.values = [...values];
        array.id = array.id ?? crypto.randomUUID();
        array.selectedIndex = null;
        if (name) array.name = name;
        bumpState();
        onEnsureArrayRef.current?.(array.values, array.name);
      },
      patch(partial) {
        const { array, teaching } = stateRef.current;
        if (partial.name !== undefined) array.name = partial.name;
        if (partial.showIndices !== undefined) array.showIndices = partial.showIndices;
        if (partial.dimensions !== undefined) array.dimensions = partial.dimensions;
        if (partial.selectedIndex !== undefined) array.selectedIndex = partial.selectedIndex;
        if (partial.topic !== undefined) teaching.topic = partial.topic;
        if (partial.algorithm !== undefined) teaching.algorithm = partial.algorithm;
        if (partial.animationEnabled !== undefined)
          teaching.animationEnabled = partial.animationEnabled;
        bumpState();
      },
      overlay: pushOverlay,
      resetCanvas() {
        const array = stateRef.current.array;
        array.selectedIndex = null;
        bumpState();
        setOverlays([]);
        player.controls.clear();
      },
      clearCanvas() {
        const array = stateRef.current.array;
        array.values = [];
        array.id = null;
        array.selectedIndex = null;
        array.dimensions = [0];
        bumpState();
        setOverlays([]);
        player.controls.clear();
        onClearRef.current?.();
      },
    }),
    // `player.controls` — not `player` — so an animation beat does not
    // rebuild the context and, with it, every tool.
    [bumpState, player.controls, pushOverlay],
  );

  // `ctx` exposes `state` as a getter over the ref, so the linter treats this
  // as reading a ref during render. It is not: createArrayTools only captures
  // `ctx` inside each tool's `execute`, which runs when the model calls a
  // tool — never during render. That live read is the whole point, since a
  // snapshot captured here would be stale by the second call in a burst.
  // eslint-disable-next-line react-hooks/refs
  const tools = useMemo(() => createArrayTools(ctx), [ctx]);

  // ── Dispatch ─────────────────────────────────────────────────────────
  const runTool = useCallback(
    async (name: string, argumentsJson: string): Promise<string> => {
      const tool = tools[name as keyof typeof tools] as
        | { execute?: (input: unknown, options: unknown) => unknown }
        | undefined;

      if (!tool?.execute) {
        return JSON.stringify({
          ok: false,
          error: `${name} is not a tool this agent has. Use one of the array tools.`,
        });
      }

      let input: unknown;
      try {
        input = JSON.parse(argumentsJson || "{}");
      } catch {
        return JSON.stringify({ ok: false, error: "Arguments were not valid JSON." });
      }

      setLastToolCall(name);
      try {
        const outcome = await tool.execute(input, {});
        return JSON.stringify(outcome);
      } catch (thrown) {
        // Never let a tool bug hang the model's turn — report it as a failed
        // call so the agent can tell the teacher something went wrong.
        console.error(`[arrays-agent] ${name} threw:`, thrown);
        return JSON.stringify({
          ok: false,
          error: thrown instanceof Error ? thrown.message : `${name} failed.`,
          state: describeAgentState(stateRef.current),
        });
      }
    },
    [tools],
  );

  // ── Session lifecycle ────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    finishRealtimeUsageSession(usageSessionIdRef.current);
    usageSessionIdRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    captionBufferRef.current = "";
    setCaption("");
    setRemoteStream(null);
    setStatus("idle");
  }, []);

  useEffect(() => disconnect, [disconnect]);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected" || status === "paused") return;

    setError(null);
    const client = new OpenAIRealtimeClient({
      tokenEndpoint: "/api/openai/realtime/arrays-agent",
      tokenBody: { canvasId, lessonTitle, responseMode },
      onToolCall: (call) => runTool(call.name, call.argumentsJson),
      onStatusChange: setStatus,
      onError: setError,
      onRemoteStream: setRemoteStream,
      onTranscriptDelta: (delta) => {
        captionBufferRef.current += delta;
        setCaption(captionBufferRef.current);
      },
      onResponseDone: (response) => {
        captionBufferRef.current = "";
        trackRealtimeResponse(
          usageSessionIdRef.current,
          response as RealtimeUsageResponse | undefined,
        );
      },
      onSpeechStarted: () => {
        captionBufferRef.current = "";
        setCaption("");
      },
    });

    clientRef.current = client;
    await client.connect();

    // The board's opening state, so the agent's first answer is grounded in
    // what is actually on screen rather than an empty assumption.
    client.syncContext(
      `board_state: ${describeAgentState(stateRef.current)}`,
    );
  }, [canvasId, lessonTitle, responseMode, runTool, status]);

  /** Push the current board into the model's context without making it speak. */
  const syncBoard = useCallback(() => {
    clientRef.current?.syncContext(`board_state: ${describeAgentState(stateRef.current)}`);
  }, []);

  /** Replace the array from outside the agent (teacher edit, canvas load). */
  const setValues = useCallback(
    (values: Array<string | number>) => {
      const array = stateRef.current.array;
      array.values = toDisplayValues(values);
      array.dimensions = [array.values.length];
      array.selectedIndex = null;
      bumpState();
      player.controls.clear();
      syncBoard();
    },
    [bumpState, player.controls, syncBoard],
  );

  const dismissOverlay = useCallback((id: string) => {
    setOverlays((previous) => previous.filter((overlay) => overlay.id !== id));
  }, []);

  // ── What the UI renders ──────────────────────────────────────────────
  // During playback the player owns the picture; at rest the published
  // snapshot does, with the selected index still lit so a spotlight survives
  // the animation ending.
  const view: ArrayFrame = useMemo(() => {
    if (player.frame) return player.frame;
    const { values, selectedIndex } = snapshot.array;
    return {
      values,
      active: selectedIndex === null ? [] : [selectedIndex],
      visited: [],
      settled: [],
      note: "",
    };
  }, [player.frame, snapshot]);

  return {
    /** Immutable snapshot — safe to read in render and to use as a dependency. */
    agentState: snapshot,
    caption,
    connect,
    disconnect,
    dismissOverlay,
    error,
    isAnimating: player.isPlaying,
    isConnected: status === "connected" || status === "paused",
    lastToolCall,
    overlays,
    remoteStream,
    setValues,
    status,
    syncBoard,
    /** Direct tool access, for demo buttons and tests. */
    tools,
    view,
  };
}
