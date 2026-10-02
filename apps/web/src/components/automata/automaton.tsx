"use client";

import { memo, useEffect, useMemo, useState } from "react";

import { useAutomataAgentView } from "@/components/automata/agent-view-context";
import { TransitionDiagram } from "@/components/automata/transition-diagram";
import { useExecutionPlayback } from "@/components/automata/use-execution-playback";
import { reconcileAutomatonProps } from "@/components/automata/authoring";
import { ExecutionPanel } from "@/components/automata/execution-panel";
import { InputString } from "@/components/automata/input-string";
import {
  createAutomatonExecution,
  executeAutomaton,
  normaliseSymbol,
  stepAutomaton,
  tokenizeAutomatonInput,
  validateAutomaton,
  type Automaton,
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
    alphabet: [
      ...new Set(
        authored.alphabet.split(",").map(normaliseSymbol).filter(Boolean),
      ),
    ],
    states,
    transitions: authored.transitions.map((transition) => ({
      ...transition,
      symbols: [
        ...new Set(
          transition.symbols.split(",").map(normaliseSymbol).filter(Boolean),
        ),
      ],
    })),
    startState,
    acceptStates: states
      .filter((state) => state.accepting)
      .map((state) => state.id),
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
    setLocalExecution(
      createAutomatonExecution(authoredAutomaton, authoredInput),
    );
  }
  const execution = agent?.execution ?? localExecution;
  const { displayedExecution, flowProgress, isTransitioning } =
    useExecutionPlayback(execution);
  const visualExecution = agent?.construction?.execution ?? displayedExecution;
  const construction = agent?.construction;
  const onConstructionReady = agent?.onConstructionReady;

  useEffect(() => {
    if (
      construction?.automatonId !== automaton.id ||
      construction.timeline.mode !== "paused" ||
      construction.timeline.currentStep !== 0 ||
      !onConstructionReady
    ) return;
    const frame = window.requestAnimationFrame(() => {
      onConstructionReady(automaton.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    onConstructionReady,
    automaton.id,
    construction?.automatonId,
    construction?.timeline.mode,
    construction?.timeline.currentStep,
  ]);

  return (
    <section
      className="canvas-automaton-block flex w-full min-w-0 flex-col gap-3"
      aria-label={`${automaton.type.toUpperCase()} automaton`}
    >
      <div className="min-w-0 overflow-hidden">
        <TransitionDiagram
          automaton={automaton}
          execution={displayedExecution}
          flowProgress={flowProgress}
          construction={agent?.construction}
          onConstructionAnimationComplete={
            agent?.onConstructionAnimationComplete
          }
        />
      </div>

      {props.showTransitionTable && !agent?.construction ? (
        <section className="grid min-w-0 gap-2" aria-label="Transition table">
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Transition table
          </h4>
          <TransitionTable
            automaton={automaton}
            execution={displayedExecution}
          />
        </section>
      ) : null}

      {!validation.valid && !agent?.construction ? (
        <p
          role="status"
          className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning"
        >
          {validation.issues.map((issue) => issue.message).join(" ")}
        </p>
      ) : null}

      {agent?.construction ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {agent.construction.timeline.currentStep} /{" "}
            {agent.construction.timeline.steps.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1"
              onClick={
                agent.construction.timeline.mode === "paused"
                  ? agent.onResumeConstruction
                  : agent.onPauseConstruction
              }
            >
              {agent.construction.timeline.mode === "paused"
                ? "Continue"
                : "Pause"}
            </button>
            {agent.construction.timeline.error ? (
              <span role="alert">{agent.construction.timeline.error}</span>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 pt-1">
        <InputString
          symbols={input}
          currentIndex={visualExecution.inputIndex}
        />
        <ExecutionPanel
          disabled={
            !validation.valid ||
            isTransitioning ||
            agent?.construction?.timeline.mode === "building" ||
            agent?.construction?.timeline.mode === "preparing"
          }
          execution={agent?.construction ? visualExecution : execution}
          onStep={
            agent?.onStep ??
            (() =>
              setLocalExecution((current) => stepAutomaton(automaton, current)))
          }
          onRun={
            agent?.onRun ??
            (() =>
              setLocalExecution(executeAutomaton(automaton, authoredInput)))
          }
          onReset={
            agent?.onReset ??
            (() =>
              setLocalExecution(
                createAutomatonExecution(automaton, authoredInput),
              ))
          }
        />
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Active states: {"{"}
        {visualExecution.currentStates
          .map(
            (stateId) =>
              automaton.states.find((state) => state.id === stateId)?.label ??
              stateId,
          )
          .join(", ")}
        {"}"}
        {automaton.type === "nfa" && visualExecution.currentStates.length > 1
          ? " · valid NFA branch set"
          : ""}
      </p>
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
