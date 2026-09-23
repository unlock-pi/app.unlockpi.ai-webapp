"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useArrayPlayer } from "@/features/arrays-agent/hooks/use-array-player";
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
import { toDisplayValues } from "@/features/arrays-agent/lib/array-frames";
import {
  type OperationRequest,
} from "@/features/arrays-agent/lib/operation-code";
import {
  createInitialAgentState,
  describeAgentState,
  type ArrayAgentState,
  type ArrayFrame,
  type ArrayOpResult,
  type ArrayValue,
  type StructureKind,
} from "@/features/arrays-agent/lib/array-types";
import {
  buildArraysAgentInstructions,
  getArrayRealtimeTools,
} from "@/features/arrays-agent/lib/agent-identity";
import { ARRAYS_AGENT_NAME } from "@/features/arrays-agent/lib/agent-name";
import { createArrayTools } from "@/features/arrays-agent/tools/array";
import {
  buildStacksAgentInstructions,
  getStackRealtimeTools,
} from "@/features/stacks-agent/lib/agent-identity";
import { STACKS_AGENT_NAME } from "@/features/stacks-agent/lib/agent-name";
import { createStackTools } from "@/features/stacks-agent/tools/stack";
import type {
  ArrayOverlay,
  ArrayToolContext,
  BlockControls,
  CombineControls,
  PresentationControls,
} from "@/features/arrays-agent/tools/tool-context";
import { trackAgentToolCall } from "@/features/realtime/lib/agent-usage-client";
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
  onCommit?: (
    values: ArrayValue[],
    state: ArrayAgentState,
    operation?: OperationRequest | null,
  ) => void;
  /**
   * Called when the agent needs somewhere to put an array — the host is
   * responsible for making a place for it (on the canvas, that means adding a
   * frame when the current one is full).
   */
  onEnsureArray?: (
    values: ArrayValue[],
    name: string,
    state: ArrayAgentState,
  ) => void;
  /** Called when the agent clears the board. */
  onClear?: () => void;
  /**
   * Frame navigation, when the agent is running inside a presentation. Omit
   * on surfaces that have no frames.
   */
  presentation?: PresentationControls;
  /** Frame block editing, when running on a canvas. */
  blocks?: BlockControls;
  /** Multi-array operations, when running on a canvas. */
  combine?: CombineControls;
  /**
   * Which tutor starts: the arrays one, or the stacks one.
   *
   * They share this whole runtime — the state, the player, the memory, the
   * activity log and the connection — because a stack IS an array with one
   * end closed. What differs is the tool set the model is offered and the
   * persona it is given, and `switchStructure` swaps both on the live
   * session without dropping the call.
   */
  structure?: StructureKind;
  /** Told when the tutors hand over, so the host can follow along in its UI. */
  onStructureChange?: (structure: StructureKind) => void;
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
  blocks,
  combine,
  structure: initialStructure = "array",
  onStructureChange,
}: UseArraysVoiceAgentArgs = {}) {
  const [status, setStatus] = useState<RealtimeStatus | "paused">("idle");
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [overlays, setOverlays] = useState<ArraysAgentOverlay[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [lastToolCall, setLastToolCall] = useState<string | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [latency, setLatency] = useState<AgentLatency>(EMPTY_LATENCY);
  /** True between speech_started and speech_stopped — the teacher has the floor. */
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  /** True while the model is generating or speaking. */
  const [isResponding, setIsResponding] = useState(false);
  /** False while the teacher has muted themselves from the dock. */
  const [micEnabled, setMicEnabled] = useState(true);
  const player = useArrayPlayer();

  const logEvent = useCallback((event: AgentEvent) => {
    setEvents((previous) => appendEvent(previous, event));
  }, []);

  /**
   * When the teacher stopped talking. The gap between this and the model's
   * first response IS the "is it understanding me" number the panel shows.
   */
  const speechEndedAtRef = useRef<number | null>(null);
  const responseSamplesRef = useRef<number[]>([]);

  // Built once, then handed to both the ref and the first snapshot so neither
  // has to read the other during render.
  /**
   * Which tutor is on. A state as well as a ref: the tool set is derived from
   * it and has to be rebuilt when it changes, while tools running mid-burst
   * read the ref.
   */
  const [structure, setStructure] = useState<StructureKind>(initialStructure);

  const [initialState] = useState<ArrayAgentState>(() => {
    const initial = createInitialAgentState(canvasId, initialStructure);
    if (initialStructure === "stack") initial.array.name = "S";
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
  /** Bounded record of what the agent did — see agent-memory.ts. */
  const memoryRef = useRef<MemoryEntry[]>([]);
  /** The last animation, kept so "show me that again, slower" can replay it. */
  const lastPlayedRef = useRef<{ frames: ArrayFrame[]; summary: string } | null>(null);
  /**
   * The code for the operation being run right now, worked out from the tool
   * call itself. It rides along to the commit so the code block and the strip
   * change together.
   */
  const pendingCodeRef = useRef<OperationRequest | null>(null);
  const contextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usageSessionIdRef = useRef<string | null>(null);
  const captionBufferRef = useRef("");
  const onCommitRef = useRef(onCommit);
  const onEnsureArrayRef = useRef(onEnsureArray);
  const onClearRef = useRef(onClear);
  const presentationRef = useRef(presentation);
  const blocksRef = useRef(blocks);
  const combineRef = useRef(combine);
  const onStructureChangeRef = useRef(onStructureChange);

  useEffect(() => {
    onStructureChangeRef.current = onStructureChange;
  }, [onStructureChange]);

  useEffect(() => {
    onCommitRef.current = onCommit;
    onEnsureArrayRef.current = onEnsureArray;
    onClearRef.current = onClear;
    presentationRef.current = presentation;
    blocksRef.current = blocks;
    combineRef.current = combine;
  }, [blocks, combine, onClear, onCommit, onEnsureArray, presentation]);

  // ── Context window ───────────────────────────────────────────────────
  /** Send the one LIVE CONTEXT message, replacing its previous copy. */
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

  /**
   * Coalesce bursts — "create, insert, explain" is three tool calls in a few
   * milliseconds, and one refreshed context afterwards says the same thing as
   * three would.
   */
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

  const pushOverlay = useCallback((overlay: ArrayOverlay) => {
    setOverlays((previous) =>
      [...previous, { ...overlay, id: crypto.randomUUID() }].slice(-MAX_OVERLAYS),
    );
  }, []);

  /**
   * Hand the class from one tutor to the other, mid-call.
   *
   * Everything the teacher can see and hear stays: the same WebRTC session,
   * the same microphone, the same canvas, the same frames. What changes is
   * the persona, the tool list and the board the agent draws into — sent to
   * OpenAI as ONE session update so the model is never the new tutor holding
   * the old tutor's tools.
   *
   * The other tutor's working notes are deliberately dropped: what the
   * arrays tutor remembers doing to an array is not something the stacks
   * tutor should carry on referring to.
   */
  const switchStructure = useCallback(
    (kind: StructureKind, seed?: ArrayValue[]) => {
      const state = stateRef.current;
      const arriving = kind === "stack" ? STACKS_AGENT_NAME : ARRAYS_AGENT_NAME;
      if (state.structure === kind) {
        return `${arriving} is already the one teaching.`;
      }

      const carried = seed?.length ? [...seed] : [];
      state.structure = kind;
      state.stackView = "bucket";
      state.capacity = null;
      state.array.name = kind === "stack" ? "S" : "A";
      state.array.values = carried;
      state.array.id = carried.length ? crypto.randomUUID() : null;
      state.array.dimensions = [carried.length];
      state.array.selectedIndex = null;
      state.teaching.topic = null;
      state.teaching.algorithm = null;
      bumpState();
      setStructure(kind);

      player.controls.clear();
      setOverlays([]);
      lastPlayedRef.current = null;
      memoryRef.current = [];
      // Let go of the block the other tutor was driving; the next operation
      // creates the right kind of block for this one.
      onClearRef.current?.();
      if (carried.length) {
        onEnsureArrayRef.current?.(carried, state.array.name, state);
      }

      clientRef.current?.updateSession({
        instructions:
          kind === "stack"
            ? buildStacksAgentInstructions({ lessonTitle, speaks: responseMode !== "silent" })
            : buildArraysAgentInstructions({ lessonTitle, speaks: responseMode !== "silent" }),
        tools: kind === "stack" ? getStackRealtimeTools() : getArrayRealtimeTools(),
      });

      onStructureChangeRef.current?.(kind);
      logEvent({ kind: "status", at: Date.now(), text: `${arriving} took over` });
      scheduleLiveContext();

      return kind === "stack"
        ? `${arriving} is taking over for stacks.${carried.length ? ` The values ${carried.join(", ")} came across as a stack, ${carried[carried.length - 1]} on top.` : " The board is clear and ready for a stack."} Only push, pop and peek from here.`
        : `${arriving} is taking over for arrays.${carried.length ? ` ${carried.join(", ")} came across as an array.` : " The board is clear and ready for an array."} Indexing, inserting and sorting are available again.`;
    },
    [bumpState, lessonTitle, logEvent, player.controls, responseMode, scheduleLiveContext],
  );

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
      get blocks() {
        return blocksRef.current;
      },
      get combine() {
        return combineRef.current;
      },
      switchStructure,
      play(result: ArrayOpResult) {
        if (!result.rejected) {
          const array = stateRef.current.array;
          array.values = [...result.values];
          array.id = array.id ?? crypto.randomUUID();
          if (array.dimensions.length === 1) array.dimensions = [result.values.length];
          bumpState();
        }
        if (!result.rejected && result.frames.length > 1) {
          lastPlayedRef.current = { frames: result.frames, summary: result.summary };
        }
        const operation = pendingCodeRef.current;
        player.controls.play(
          result.frames,
          { speed: stateRef.current.teaching.speed },
          () => {
            onCommitRef.current?.(
              stateRef.current.array.values,
              stateRef.current,
              operation,
            );
          },
        );
      },
      replayLast(speed) {
        const last = lastPlayedRef.current;
        if (!last) {
          return { ok: false, message: "There is nothing to replay yet." };
        }
        if (speed) {
          stateRef.current.teaching.speed = speed;
          bumpState();
        }
        const playbackSpeed = speed ?? stateRef.current.teaching.speed;
        player.controls.play(last.frames, { speed: playbackSpeed });
        const pace =
          playbackSpeed === "slow"
            ? "Replaying slowly"
            : playbackSpeed === "instant"
              ? "Showing the result"
              : "Replaying";
        return { ok: true, message: `${pace}: ${last.summary}` };
      },
      ensureArray(values, name) {
        const array = stateRef.current.array;
        array.values = [...values];
        array.id = array.id ?? crypto.randomUUID();
        array.selectedIndex = null;
        if (name) array.name = name;
        bumpState();
        onEnsureArrayRef.current?.(array.values, array.name, stateRef.current);
      },
      patch(partial) {
        const { array, teaching } = stateRef.current;
        if (partial.name !== undefined) array.name = partial.name;
        if (partial.showIndices !== undefined) array.showIndices = partial.showIndices;
        if (partial.dimensions !== undefined) array.dimensions = partial.dimensions;
        if (partial.selectedIndex !== undefined) array.selectedIndex = partial.selectedIndex;
        if (partial.topic !== undefined) teaching.topic = partial.topic;
        if (partial.algorithm !== undefined) teaching.algorithm = partial.algorithm;
        if (partial.speed !== undefined) teaching.speed = partial.speed;
        if (partial.capacity !== undefined) stateRef.current.capacity = partial.capacity;
        if (partial.stackView !== undefined) stateRef.current.stackView = partial.stackView;
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
    [bumpState, player.controls, pushOverlay, switchStructure],
  );

  // `ctx` exposes `state` as a getter over the ref, so the linter treats this
  // as reading a ref during render. It is not: createArrayTools only captures
  // `ctx` inside each tool's `execute`, which runs when the model calls a
  // tool — never during render. That live read is the whole point, since a
  // snapshot captured here would be stale by the second call in a burst.
  // Which tutor's vocabulary the model is offered. The two sets deliberately
  // do not overlap where it matters: there is no insert_at_index on a stack.
  const createTools =
    structure === "stack"
      ? (createStackTools as unknown as typeof createArrayTools)
      : createArrayTools;
  // eslint-disable-next-line react-hooks/refs
  const tools = useMemo(() => createTools(ctx), [createTools, ctx]);

  /**
   * Book the tool call against this session, for the admin credits view.
   *
   * The response id comes from the live client because OpenAI bills per
   * response: without it the call is recorded but cannot be priced, which
   * the admin panel reports as unpriced rather than free.
   */
  const recordToolCall = useCallback(
    (tool: string, callId: string | undefined, ok: boolean, durationMs: number) => {
      if (!callId) return;
      trackAgentToolCall({
        usageSessionId: usageSessionIdRef.current,
        callId,
        responseId: clientRef.current?.getCurrentResponseId() ?? null,
        agent: stateRef.current.structure === "stack" ? "stacks" : "arrays",
        toolName: tool,
        ok,
        durationMs,
      });
    },
    [],
  );

  // ── Dispatch ─────────────────────────────────────────────────────────
  const runTool = useCallback(
    async (name: string, argumentsJson: string, callId?: string): Promise<string> => {
      const tool = tools[name as keyof typeof tools] as
        | { execute?: (input: unknown, options: unknown) => unknown }
        | undefined;

      if (!tool?.execute) {
        return JSON.stringify({
          ok: false,
          error:
            stateRef.current.structure === "stack"
              ? `${name} is not something a stack can do. A stack has push, pop and peek — nothing that reaches into the middle. Say so, and offer one of those instead.`
              : `${name} is not a tool this agent has. Use one of the array tools.`,
        });
      }

      let input: unknown;
      try {
        input = JSON.parse(argumentsJson || "{}");
      } catch {
        return JSON.stringify({ ok: false, error: "Arguments were not valid JSON." });
      }

      setLastToolCall(name);
      // Worked out before the tool runs, from the arguments the model chose —
      // the same arguments the operation is about to carry out.
      pendingCodeRef.current = {
        tool: name,
        args: (input ?? {}) as Record<string, unknown>,
      };
      const startedAt = performance.now();
      try {
        const outcome = (await tool.execute(input, {})) as {
          ok?: boolean;
          summary?: string;
        };
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
        recordToolCall(name, callId, outcome?.ok !== false, durationMs);
        return JSON.stringify(outcome);
      } catch (thrown) {
        // Never let a tool bug hang the model's turn — report it as a failed
        // call so the agent can tell the teacher something went wrong.
        console.error(`[arrays-agent] ${name} threw:`, thrown);
        recordToolCall(name, callId, false, performance.now() - startedAt);
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
    [logEvent, recordToolCall, remember, tools],
  );

  /**
   * Dispatch through a ref, not the closure.
   *
   * The client is built once per connection, but the tool set is rebuilt
   * whenever the tutors hand over. Capturing `runTool` directly would leave a
   * live session calling the previous tutor's tools — every stack command
   * answered with "that is not a tool this agent has".
   */
  const runToolRef = useRef(runTool);
  useEffect(() => {
    runToolRef.current = runTool;
  }, [runTool]);

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
      tokenEndpoint:
        structure === "stack"
          ? "/api/openai/realtime/stacks-agent"
          : "/api/openai/realtime/arrays-agent",
      tokenBody: { canvasId, lessonTitle, responseMode },
      onToolCall: (call) =>
        runToolRef.current(call.name, call.argumentsJson, call.callId),
      onStatusChange: (next) => {
        setStatus(next);
        logEvent({ kind: "status", at: Date.now(), text: next });
        // The data channel is only writable once connected; context sent
        // before this point was silently dropped.
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
        setError(message);
        logEvent({ kind: "error", at: Date.now(), text: message });
      },
      onRemoteStream: setRemoteStream,
      onTranscriptDelta: (delta) => {
        captionBufferRef.current += delta;
        setCaption(captionBufferRef.current);
      },
      onUserTranscript: (text) => {
        // The single most useful line in the panel: what it actually heard.
        logEvent({ kind: "heard", at: Date.now(), text });
      },
      onResponseCreated: () => {
        setIsResponding(true);
      },
      onFirstOutput: () => {
        // Measured to the first word, tool call or audio — not to the moment
        // an empty response object appeared, which reads near-zero whether or
        // not the agent understood anything.
        const startedAt = speechEndedAtRef.current;
        if (startedAt === null) return;

        const responseMs = performance.now() - startedAt;
        speechEndedAtRef.current = null;
        responseSamplesRef.current = [...responseSamplesRef.current, responseMs].slice(-20);
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
        // Start the clock: everything after this is the agent's turnaround.
        speechEndedAtRef.current = performance.now();
      },
      onToolCallStart: (call) => {
        setLastToolCall(call.name);
      },
    });

    clientRef.current = client;
    await client.connect();
  }, [canvasId, lessonTitle, logEvent, pushLiveContext, responseMode, status, structure]);

  /** Push the current board into the model's context without making it speak. */
  const syncBoard = scheduleLiveContext;

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

  /**
   * Take over an array that already exists on the board.
   *
   * Called when the class moves to a frame: the agent must talk about the
   * array the teacher can SEE, not one it remembers building. Passing null
   * means the frame has no array, and the agent should know the board is
   * genuinely empty rather than keep the previous frame's values.
   */
  const adoptArray = useCallback(
    (
      adopted: { blockId: string; values: string[]; name: string; showIndices: boolean } | null,
    ) => {
      const array = stateRef.current.array;
      array.id = adopted?.blockId ?? null;
      array.values = adopted ? [...adopted.values] : [];
      array.name = adopted?.name || "A";
      array.showIndices = adopted?.showIndices ?? true;
      array.dimensions = [array.values.length];
      array.selectedIndex = null;
      bumpState();
      player.controls.clear();
      setOverlays([]);
      syncBoard();
    },
    [bumpState, player.controls, syncBoard],
  );

  /** Mute or unmute the teacher's microphone without ending the session. */
  const toggleMic = useCallback(() => {
    setMicEnabled((enabled) => {
      const next = !enabled;
      clientRef.current?.setMicrophoneEnabled(next);
      return next;
    });
  }, []);

  /**
   * Ask the agent to say something now. Returns false when it is already
   * talking or the teacher is mid-sentence — the dock reports that rather
   * than queueing a greeting that would arrive over the top of them.
   */
  const speakNow = useCallback((instructions: string) => {
    return clientRef.current?.requestResponse(instructions) ?? false;
  }, []);

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
    /** Which tutor is teaching right now. */
    structure,
    /** The tutor's name, for the dock and the activity panel. */
    agentName: structure === "stack" ? STACKS_AGENT_NAME : ARRAYS_AGENT_NAME,
    switchStructure,
    caption,
    connect,
    disconnect,
    dismissOverlay,
    adoptArray,
    error,
    events,
    isResponding,
    isUserSpeaking,
    latency,
    isAnimating: player.isPlaying,
    micEnabled,
    toggleMic,
    speakNow,
    /** The beat playing right now, for narrating the animation as it runs. */
    animationNote: player.isPlaying ? (player.frame?.note ?? "") : "",
    animationProgress: player.progress,
    animationSpeed: snapshot.teaching.speed,
    skipAnimation: player.controls.skip,
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
