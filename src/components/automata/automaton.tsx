"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";

import { useAutomataAgentView } from "@/components/automata/agent-view-context";
import { TRANSITION_ARRIVAL_DELAY_MS } from "@/components/automata/animation-timing";
import { AutomatonNetwork } from "@/components/automata/automaton-network";
import { reconcileAutomatonProps } from "@/components/automata/authoring";
import { ExecutionPanel } from "@/components/automata/execution-panel";
import { InputString } from "@/components/automata/input-string";
import {
  createAutomatonExecution,
  normaliseSymbol,
  stepAutomaton,
  tokenizeAutomatonInput,
  validateAutomaton,
  type Automaton,
  type AutomatonExecution,
  type AutomatonType,
  type AutomatonVisualStatus,
} from "@/components/automata/model";
import { TransitionTable } from "@/components/automata/transition-table";

export type AutomatonBlockState = {
  id: string;
  label: string;
  initial?: boolean;
  accepting?: boolean;
  status?: AutomatonVisualStatus;
};

export type AutomatonBlockTransition = {
  id: string;
  from: string;
  to: string;
  symbols: string;
  status?: AutomatonVisualStatus;
};

export type AutomatonBlockProps = {
  /** Formal identity, separate from Puck's component instance id. */
  automatonId?: string;
  type: AutomatonType;
  alphabet: string;
  states: AutomatonBlockState[];
  transitions: AutomatonBlockTransition[];
  input: string;
  showTransitionTable: boolean;
};

type AutomatonBlockRenderProps = AutomatonBlockProps & { id: string };

const TRANSITION_SETTLE_DELAY_MS = 140;

// Puck can remount a block when transient agent state changes. Keep the
// completed-step cursor outside the component so a remount continues from the
// last reached state instead of replaying the trace from step zero.
const playbackCursorByExecution = new Map<string, number>();

function playbackCursor(execution: AutomatonExecution) {
  return Math.min(
    playbackCursorByExecution.get(execution.executionId) ?? 0,
    execution.steps.length,
  );
}

function executionBeforeStep(execution: AutomatonExecution, stepCount: number): AutomatonExecution {
  const steps = execution.steps.slice(0, stepCount);
  const step = steps.at(-1);
  if (!step) return execution;
  const completedSteps = steps.slice(0, -1);

  return {
    ...execution,
    status: "running",
    result: "unknown",
    inputIndex: step.inputIndex,
    currentStates: step.fromStates,
    activeTransitions: step.transitions,
    transitionPhase: "traveling",
    visitedStates: [
      ...new Set(completedSteps.flatMap((item) => [...item.fromStates, ...item.toStates])),
      ...step.fromStates,
    ],
    visitedTransitions: [...new Set(completedSteps.flatMap((item) => item.transitions))],
    stepIndex: step.stepIndex,
    steps,
  };
}

function executionAtStep(execution: AutomatonExecution, stepCount: number): AutomatonExecution {
  const steps = execution.steps.slice(0, stepCount);
  const step = steps.at(-1);
  if (!step) return execution;

  return {
    ...execution,
    status: step.status,
    result: step.result,
    inputIndex: step.symbol === null ? step.inputIndex : step.inputIndex + 1,
    currentStates: step.toStates,
    activeTransitions: step.transitions,
    transitionPhase: undefined,
    visitedStates: [...new Set(steps.flatMap((item) => [...item.fromStates, ...item.toStates]))],
    visitedTransitions: [...new Set(steps.flatMap((item) => item.transitions))],
    stepIndex: step.stepIndex,
    steps,
  };
}

/**
 * Agent tools may evaluate a whole input string in one state update. Replay its
 * recorded steps locally so every state-to-state transition remains visible.
 */
function useExecutionPlayback(execution: AutomatonExecution) {
  const initialCursor = playbackCursor(execution);
  const [displayedExecution, setDisplayedExecution] = useState(() =>
    execution.steps[initialCursor]
      ? executionBeforeStep(execution, initialCursor + 1)
      : execution,
  );
  const [isTransitioning, setIsTransitioning] = useState(
    () => Boolean(execution.steps[initialCursor]?.transitions.length),
  );
  const latestExecutionRef = useRef(execution);
  const playbackRef = useRef({
    executionId: execution.executionId,
    nextStep: initialCursor,
    timeout: null as ReturnType<typeof setTimeout> | null,
  });
  const advanceRef = useRef<() => void>(() => {});

  // Agent updates can append steps while the signal is moving. Keep the current
  // timer alive and read the newest trace only when this step actually arrives.
  useEffect(() => {
    latestExecutionRef.current = execution;
    advanceRef.current = () => {
      const playback = playbackRef.current;
      if (playback.timeout) return;
      const latest = latestExecutionRef.current;
      if (latest.executionId !== playback.executionId) return;
      const step = latest.steps[playback.nextStep];
      if (!step) {
        setIsTransitioning(false);
        setDisplayedExecution(latest);
        return;
      }
  
      const stepCount = playback.nextStep + 1;
      if (!step.transitions.length) {
        setIsTransitioning(false);
        setDisplayedExecution(executionAtStep(latest, stepCount));
        playback.nextStep = stepCount;
        playbackCursorByExecution.set(playback.executionId, stepCount);
        playback.timeout = setTimeout(() => {
          playback.timeout = null;
          advanceRef.current();
        }, TRANSITION_SETTLE_DELAY_MS);
        return;
      }
  
      setIsTransitioning(true);
      setDisplayedExecution(executionBeforeStep(latest, stepCount));
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : TRANSITION_ARRIVAL_DELAY_MS;
      playback.timeout = setTimeout(() => {
        const current = latestExecutionRef.current;
        if (current.executionId !== playback.executionId) return;
        setDisplayedExecution(executionAtStep(current, stepCount));
        playback.nextStep = stepCount;
        playbackCursorByExecution.set(playback.executionId, stepCount);
        playback.timeout = setTimeout(() => {
          playback.timeout = null;
          setIsTransitioning(false);
          advanceRef.current();
        }, TRANSITION_SETTLE_DELAY_MS);
      }, duration);
    };

    const playback = playbackRef.current;
    if (playback.executionId !== execution.executionId ||
        execution.steps.length < playback.nextStep) {
      if (playback.timeout) clearTimeout(playback.timeout);
      playback.timeout = null;
      playback.executionId = execution.executionId;
      playback.nextStep = playbackCursor(execution);
    }
    if (!playback.timeout) {
      playback.timeout = setTimeout(() => {
        playback.timeout = null;
        advanceRef.current();
      }, 0);
    }
  }, [execution]);

  useEffect(() => () => {
    const playback = playbackRef.current;
    if (playback.timeout) clearTimeout(playback.timeout);
    playback.timeout = null;
  }, []);

  return { displayedExecution, isTransitioning };
}

// Puck recreates block-prop objects during unrelated editor updates. Compare
// persisted values so those updates do not disturb diagram animation.
function automatonBlockPropsKey(props: AutomatonBlockRenderProps) {
  return JSON.stringify({
    id: props.id,
    automatonId: props.automatonId,
    type: props.type,
    alphabet: props.alphabet,
    states: props.states,
    transitions: props.transitions,
    input: props.input,
    showTransitionTable: props.showTransitionTable,
  });
}

function areAutomatonBlockPropsEqual(
  previous: AutomatonBlockRenderProps,
  next: AutomatonBlockRenderProps,
) {
  return automatonBlockPropsKey(previous) === automatonBlockPropsKey(next);
}

export function toAutomaton(props: AutomatonBlockRenderProps): Automaton {
  const authored = reconcileAutomatonProps(props);
  const states = authored.states.map((state) => ({
    ...state,
    label: state.label.trim() || state.id,
  }));
  const startState = states.find((state) => state.initial)?.id ?? "";
  return {
    id: authored.automatonId?.trim() || props.id,
    type: authored.type,
    alphabet: [...new Set(authored.alphabet.split(",").map(normaliseSymbol).filter(Boolean))],
    states,
    transitions: authored.transitions.map((transition) => ({
      ...transition,
      symbols: [...new Set(transition.symbols.split(",").map(normaliseSymbol).filter(Boolean))],
    })),
    startState,
    acceptStates: states.filter((state) => state.accepting).map((state) => state.id),
  };
}

export function toAutomatonBlockProps(
  automaton: Automaton,
  input = "",
  showTransitionTable = true,
): AutomatonBlockProps {
  return {
    automatonId: automaton.id,
    type: automaton.type,
    alphabet: automaton.alphabet.join(", "),
    states: automaton.states.map((state) => ({
      id: state.id,
      label: state.label,
      initial: state.id === automaton.startState,
      accepting: automaton.acceptStates.includes(state.id),
      status: state.status ?? "normal",
    })),
    transitions: automaton.transitions.map((transition) => ({
      id: transition.id,
      from: transition.from,
      to: transition.to,
      symbols: transition.symbols.join(", "),
      status: transition.status ?? "normal",
    })),
    input,
    showTransitionTable,
  };
}

function AutomatonBlockComponent(props: AutomatonBlockRenderProps) {
  const authoredAutomaton = useMemo(() => toAutomaton(props), [props]);
  const authoredInput = props.input;
  const agent = useAutomataAgentView(props.id);
  const automaton = agent?.automaton ?? authoredAutomaton;
  const inputText = agent?.execution.input ?? authoredInput;
  const input = useMemo(
    () => tokenizeAutomatonInput(automaton, inputText),
    [automaton, inputText],
  );
  const validation = useMemo(() => validateAutomaton(automaton), [automaton]);
  const [localExecution, setLocalExecution] = useState(() =>
    createAutomatonExecution(authoredAutomaton, authoredInput),
  );

  const executionKey = `${JSON.stringify(authoredAutomaton)}:${authoredInput}`;
  const [lastExecutionKey, setLastExecutionKey] = useState(executionKey);
  if (!agent && lastExecutionKey !== executionKey) {
    setLastExecutionKey(executionKey);
    setLocalExecution(createAutomatonExecution(authoredAutomaton, authoredInput));
  }
  const execution = agent?.execution ?? localExecution;
  const { displayedExecution, isTransitioning } = useExecutionPlayback(execution);

  return (
    <section
      className="canvas-automaton-block flex w-full min-w-0 flex-col gap-3"
      aria-label={`${automaton.type.toUpperCase()} automaton`}
    >
      <div className="min-w-0 overflow-hidden">
        <AutomatonNetwork automaton={automaton} execution={displayedExecution} />
      </div>

      {props.showTransitionTable ? (
        <section className="grid min-w-0 gap-2" aria-label="Transition table">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Transition table
          </h4>
          <TransitionTable automaton={automaton} execution={displayedExecution} />
        </section>
      ) : null}

      {!validation.valid ? (
        <p
          role="status"
          className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
        >
          {validation.issues.map((issue) => issue.message).join(" ")}
        </p>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-1">
        <InputString symbols={input} currentIndex={displayedExecution.inputIndex} />
        <ExecutionPanel
          disabled={!validation.valid || isTransitioning}
          execution={execution}
          onStep={
            agent?.onStep ??
            (() => setLocalExecution((current) => stepAutomaton(automaton, current)))
          }
          onReset={
            agent?.onReset ??
            (() => setLocalExecution(createAutomatonExecution(automaton, authoredInput)))
          }
        />
      </div>
    </section>
  );
}

const MemoizedAutomatonBlock = memo(
  AutomatonBlockComponent,
  areAutomatonBlockPropsEqual,
);

// Puck requires a regular component function, while the memoized child keeps
// editor-wide updates from reaching the interactive diagram.
export function AutomatonBlock(props: AutomatonBlockRenderProps) {
  return <MemoizedAutomatonBlock {...props} />;
}
