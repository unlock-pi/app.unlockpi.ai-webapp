"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { z } from "zod";
import {
  TeachingTimeline,
  type TeachingStep,
} from "@/features/toc/construction/timeline-agent";
import {
  constructionView,
  validateConstructionPlan,
  type AutomataConstructionView,
} from "@/features/automata-agent/construction/automata-construction-agent";
import { timelineFromAutomaton } from "@/features/automata-agent/construction/trace-adapters-agent";
import {
  createConstructionTools,
  type ConstructionController,
} from "@/features/automata-agent/construction/construction-tools-agent";
import {
  createAutomatonExecution,
  executeAutomaton,
  validateAutomaton,
  type Automaton,
  type AutomatonExecution,
} from "@/components/automata/model";
import {
  completeExecutionPlayback,
  executionAtStep,
  executionBeforeStep,
} from "@/components/automata/use-execution-playback";
import {
  appendEvent,
  EMPTY_LATENCY,
  summarizeArgs,
  type AgentEvent,
  type AgentLatency,
} from "@/features/arrays-agent/lib/agent-activity";
import { buildAutomataLiveContext } from "@/features/automata-agent/lib/agent-context-agent";
import {
  createInitialAutomataState,
  putAutomaton,
  selectedAutomaton,
  type AutomataAgentState,
} from "@/features/automata-agent/lib/automaton-engine-agent";
import type { FrameAutomatonSnapshot } from "@/features/automata-agent/hooks/use-automata-canvas-bridge-agent";
import { createAutomataTools } from "@/features/automata-agent/tools/automata-agent";
import type {
  AutomataCommit,
  AutomataToolContext,
} from "@/features/automata-agent/tools/tool-context-agent";
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
  const constructionAutomatonRef = useRef<Automaton | null>(null);
  const constructionExecutionRef = useRef<AutomatonExecution | null>(null);
  const automaticVisualConstructionRef = useRef(false);
  const pendingConstructionStartRef = useRef<string | null>(null);
  const [construction, setConstruction] =
    useState<AutomataConstructionView | null>(null);
  const responseModeRef = useRef(responseMode);
  useEffect(() => {
    responseModeRef.current = responseMode;
  }, [responseMode]);
  const [timeline] = useState(
    () =>
      new TeachingTimeline(
        {
          prepare(step, token) {
            if (
              responseModeRef.current === "silent" ||
              automaticVisualConstructionRef.current
            ) {
              timeline.narrationStarted(token);
              timeline.narrationCompleted(token);
              return;
            }
            clientRef.current?.setTeachingTimelineActive(true);
            if (!clientRef.current)
              throw new Error(
                "Connect the agent before starting narrated construction.",
              );
            clientRef.current.prepareNarration(token, step.narration, {
              start: () => {
                captionBufferRef.current = "";
                setCaption("");
                timeline.narrationStarted(token);
              },
              complete: () => timeline.narrationCompleted(token),
              fail: (message) => timeline.fail(token, message),
            });
          },
          cancel(token) {
            clientRef.current?.cancelNarration(token);
          },
        },
        (state) => {
          const automaton = constructionAutomatonRef.current;
          const trace = constructionExecutionRef.current;
          const view =
            automaton && state.mode !== "idle" && state.mode !== "complete"
              ? constructionView(automaton.id, state)
              : null;
          if (view && trace) {
            const action = state.steps[state.currentStep]?.action;
            const completed = state.steps
              .slice(0, state.currentStep)
              .filter((step) => step.action.type === "execute_step").length;
            view.execution =
              action?.type === "execute_step" && state.mode === "building"
                ? state.animation === "complete"
                  ? executionAtStep(trace, action.stepIndex + 1)
                  : executionBeforeStep(trace, action.stepIndex + 1)
                : completed
                  ? executionAtStep(trace, completed)
                  : createAutomatonExecution(automaton!, trace.input);
          }
          setConstruction(view);
          if (state.mode === "complete" && trace && automaton) {
            completeExecutionPlayback(trace);
            const next = structuredClone(stateRef.current);
            next.executions[automaton.id] = trace;
            stateRef.current = next;
            setSnapshot(structuredClone(next));
          }
          if (
            state.mode === "complete" ||
            state.mode === "idle" ||
            state.mode === "error"
          )
            clientRef.current?.setTeachingTimelineActive(false);
        },
      ),
  );
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
    clientRef.current?.replaceContext(
      "live",
      buildAutomataLiveContext(stateRef.current),
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

  const ctx = useMemo<AutomataToolContext>(
    () => ({
      get state() {
        return stateRef.current;
      },
      commit(next, change?: AutomataCommit) {
        const previousSelected = stateRef.current.selectedAutomatonId;
        const created = change?.created;
        const animateCreation = Boolean(
          created &&
          onCreateRef.current &&
          constructionAutomatonRef.current?.id !== created.id &&
          validateAutomaton(created).valid,
        );
        if (created && animateCreation) {
          const steps = timelineFromAutomaton(created);
          validateConstructionPlan(created, steps);
          automaticVisualConstructionRef.current = true;
          constructionAutomatonRef.current = created;
          constructionExecutionRef.current = null;
          timeline.load(steps);
          pendingConstructionStartRef.current = created.id;
        }
        stateRef.current = structuredClone(next);
        setSnapshot(structuredClone(next));
        const selectedId = next.selectedAutomatonId;
        const input = selectedId
          ? (next.executions[selectedId]?.input ?? "")
          : "";
        if (created) onCreateRef.current?.(created, input);
        if (change?.definitionChanged) {
          onDefinitionChangeRef.current?.(change.definitionChanged, input);
        }
        // onCreate already targets the newly inserted Puck block. Running the
        // selection bridge in the same commit reads the pre-update document and
        // can clear that target before construction begins.
        if (selectedId !== previousSelected && !created) {
          onSelectionChangeRef.current?.(selectedId);
        }
        scheduleLiveContext();
      },
    }),
    [scheduleLiveContext, timeline],
  );

  // The getter is intentionally evaluated only when a tool executes.
  const controller = useMemo<ConstructionController>(
    () => ({
      start(automaton, steps, input) {
        if (stateRef.current.automata[automaton.id])
          throw new Error("Choose a new automaton ID for construction.");
        if (
          responseModeRef.current !== "silent" &&
          clientRef.current?.getStatus() !== "connected"
        )
          throw new Error(
            "Connect the voice agent before narrated construction.",
          );
        automaticVisualConstructionRef.current = false;
        constructionAutomatonRef.current = automaton;
        constructionExecutionRef.current = null;
        timeline.load(steps);
        pendingConstructionStartRef.current = automaton.id;
        ctx.commit(putAutomaton(ctx.state, automaton, input), {
          created: automaton,
        });
      },
      control(action) {
        if (!["resume", "step", "complete"].includes(action))
          clientRef.current?.setTeachingTimelineActive(false);
        if (
          !constructionAutomatonRef.current ||
          timeline.snapshot().mode === "idle"
        )
          throw new Error("No construction is active.");
        if (action === "complete") {
          if (
            timeline.snapshot().currentStep < timeline.snapshot().steps.length
          )
            throw new Error(
              "Finish every construction step before completing.",
            );
          timeline.resume();
        } else if (action === "step") timeline.resume(false);
        else timeline[action]();
      },
      execute(input, narrations) {
        if (
          ["preparing", "building", "paused"].includes(timeline.snapshot().mode)
        )
          throw new Error(
            "Finish the construction before an execution walkthrough.",
          );
        const automaton = selectedAutomaton(stateRef.current);
        if (!automaton) throw new Error("Select an automaton first.");
        const trace = executeAutomaton(automaton, input);
        if (trace.status === "error")
          throw new Error(trace.error ?? "Input could not be evaluated.");
        if (
          responseModeRef.current !== "silent" &&
          clientRef.current?.getStatus() !== "connected"
        )
          throw new Error("Connect the voice agent first.");
        if (narrations && narrations.length !== trace.steps.length)
          throw new Error(
            "Provide exactly one narration for each execution step: " +
              trace.steps.length,
          );
        const prefix: TeachingStep[] = [
          ...automaton.states.map((state) => ({
            id: "prepared-state:" + state.id,
            action: { type: "create_state" as const, stateId: state.id },
            narration: "",
          })),
          {
            id: "prepared-start",
            action: {
              type: "set_initial_state",
              stateId: automaton.startState,
            },
            narration: "",
          },
          ...automaton.acceptStates.map((stateId) => ({
            id: "prepared-accept:" + stateId,
            action: { type: "set_accepting_state" as const, stateId },
            narration: "",
          })),
          ...automaton.transitions.map((edge) => ({
            id: "prepared-edge:" + edge.id,
            action: {
              type: "create_transition" as const,
              transitionId: edge.id,
            },
            narration: "",
          })),
        ];
        const steps: TeachingStep[] = trace.steps.map((step, index) => ({
          id: "execution:" + index,
          action: { type: "execute_step", stepIndex: index },
          narration:
            narrations?.[index] ??
            (step.symbol === null
              ? "The empty input is " + trace.result + "."
              : "From " +
                step.fromStates.join(", ") +
                ", read " +
                step.symbol +
                ". The reachable states are " +
                (step.toStates.join(", ") || "the empty set") +
                "." +
                (index === trace.steps.length - 1
                  ? " The input is " + trace.result + "."
                  : "")),
        }));
        automaticVisualConstructionRef.current = false;
        constructionAutomatonRef.current = automaton;
        constructionExecutionRef.current = trace;
        const next = structuredClone(stateRef.current);
        next.executions[automaton.id] = createAutomatonExecution(
          automaton,
          input,
        );
        ctx.commit(next, { definitionChanged: automaton });
        timeline.load([...prefix, ...steps], prefix.length);
        timeline.resume();
      },
      narrate(stepId, text) {
        timeline.updateNarration(stepId, text);
      },
      inspect: () => timeline.snapshot(),
    }),
    [ctx, timeline],
  );
  const tools = useMemo(
    () => ({
      ...createAutomataTools(ctx),
      ...createConstructionTools(controller),
    }),
    [ctx, controller],
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
            message: `${name} is not a registered automata tool.`,
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
        const parsed = definition.inputSchema.safeParse(input);
        if (!parsed.success)
          return JSON.stringify({
            success: false,
            ok: false,
            error: {
              code: "INVALID_TOOL_INPUT",
              message: "Tool arguments did not match the schema.",
              details: z.flattenError(parsed.error),
            },
          });
        input = parsed.data;
      }
      if (
        ![
          "start_construction",
          "control_construction",
          "animate_execution",
          "narrate_step",
          "inspect_automaton",
          "validate_automaton",
          "analyze_automaton",
        ].includes(name) &&
        ["preparing", "building", "paused"].includes(timeline.snapshot().mode)
      ) {
        return JSON.stringify({
          success: false,
          ok: false,
          error: {
            code: "CONSTRUCTION_ACTIVE",
            message:
              "Finish construction before mutating or executing its automaton.",
          },
        });
      }
      setLastToolCall(name);
      const startedAt = performance.now();
      try {
        const outcome = (await definition.execute(input, {})) as {
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
        console.error(`[automata-agent] ${name} threw:`, thrown);
        logEvent({ kind: "error", at: Date.now(), text: message });
        return JSON.stringify({
          success: false,
          ok: false,
          error: { code: "INVALID_OPERATION", message },
        });
      }
    },
    [logEvent, tools, timeline],
  );

  const disconnect = useCallback(() => {
    timeline.pause();
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
  }, [timeline]);

  useEffect(() => disconnect, [disconnect]);

  const connect = useCallback(async () => {
    if (
      status === "connecting" ||
      status === "connected" ||
      status === "paused"
    )
      return;
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
      onAudioPlaybackChange: setIsResponding,
      onNarrationResponseDone: (response) =>
        trackRealtimeResponse(
          usageSessionIdRef.current,
          response as RealtimeUsageResponse | undefined,
        ),
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
        if (spoken) logEvent({ kind: "said", at: Date.now(), text: spoken });
        captionBufferRef.current = "";
        trackRealtimeResponse(
          usageSessionIdRef.current,
          response as RealtimeUsageResponse | undefined,
        );
      },
      onSpeechStarted: () => {
        timeline.pause();
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
    timeline,
  ]);

  const adoptAutomata = useCallback(
    (snapshots: FrameAutomatonSnapshot[]) => {
      timeline.clear();
      pendingConstructionStartRef.current = null;
      constructionAutomatonRef.current = null;
      constructionExecutionRef.current = null;
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
    [canvasId, scheduleLiveContext, timeline],
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
      toolName: "step_execution" | "simulate_automaton" | "reset_execution",
    ) => {
      const definition = tools[toolName] as unknown as {
        execute: (input: unknown, options: unknown) => Promise<unknown>;
      };
      await definition.execute({}, {});
    },
    [tools],
  );

  const onConstructionAnimationComplete = useCallback(
    (token: string) => timeline.animationCompleted(token),
    [timeline],
  );
  const onConstructionReady = useCallback(
    (automatonId: string) => {
      const current = timeline.snapshot();
      if (
        pendingConstructionStartRef.current !== automatonId ||
        constructionAutomatonRef.current?.id !== automatonId ||
        current.mode !== "paused" ||
        current.currentStep !== 0
      ) return;
      pendingConstructionStartRef.current = null;
      timeline.resume();
    },
    [timeline],
  );
  const automaton = selectedAutomaton(snapshot);
  const execution = automaton
    ? (snapshot.executions[automaton.id] ?? null)
    : null;

  return {
    construction,
    onConstructionAnimationComplete,
    onConstructionReady,
    pauseConstruction: () => {
      timeline.pause();
      clientRef.current?.setTeachingTimelineActive(false);
    },
    resumeConstruction: () => {
      pendingConstructionStartRef.current = null;
      timeline.resume();
    },
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
    resetSelected: () =>
      construction
        ? controller.control("reset")
        : void runDirect("reset_execution"),
    simulateSelected: () =>
      construction ? undefined : void runDirect("simulate_automaton"),
    stepSelected: () =>
      construction ? timeline.resume(false) : void runDirect("step_execution"),
    status,
    toggleMic,
    tools,
  };
}
