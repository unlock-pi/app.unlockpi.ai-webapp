"use client";
import { useMemo, useRef, useState } from "react";
import type { AutomatonExecution } from "@/packages/blocks/automata/model";
import { TransitionDiagram } from "@/packages/blocks/automata/transition-diagram";
import { ExecutionControls } from "@/components/toc/shared/execution-controls";
import { StackStrip } from "@/components/data-structure/stack-strip";
import { PDATransitionTable } from "@/components/pda/pda-transition-table";
import { Button } from "@/components/ui/button";
import { usePDAAgentView } from "@/components/pda/agent-view-context";
import {
  createPDAExecution,
  pdaAsAutomaton,
  simulatePDA,
  stepPDA,
  type PDA,
  type PDAExecution,
  validatePDA,
} from "@/features/pda/model-agent";
import { createPDATools, type PDAState } from "@/features/pda/tools-agent";
import {
  constructionView,
  type AutomataConstructionView,
} from "@/features/automata-agent/construction/automata-construction-agent";
import { timelineFromAutomaton } from "@/features/automata-agent/construction/trace-adapters-agent";
import { TeachingTimeline } from "@/features/toc/construction/timeline-agent";

export type PDAToolName =
  | "create_pda"
  | "inspect_pda"
  | "validate_pda"
  | "step_pda"
  | "simulate_pda"
  | "reset_pda";
export type PDAToolExecutor = (
  name: PDAToolName,
  input: Record<string, unknown>,
) => Promise<unknown> | unknown;
export type PDABlockProps = {
  pda: PDA;
  input: string;
  showTransitionTable?: boolean;
  onToolExecute?: PDAToolExecutor;
};

const problemCommands: Array<{ label: string; pda: PDA; input: string }> = [
  {
    label: "Create PDA for aⁿbⁿ",
    input: "aabb",
    pda: {
      id: "anbn-example",
      inputAlphabet: ["a", "b"],
      stackAlphabet: ["Z", "A"],
      startState: "q0",
      acceptStates: ["qf"],
      initialStackSymbol: "Z",
      acceptanceMode: "final_state",
      states: [
        { id: "q0", label: "q0" },
        { id: "q1", label: "q1" },
        { id: "qf", label: "qf", accepting: true },
      ],
      transitions: [
        {
          id: "push-z",
          from: "q0",
          to: "q0",
          inputSymbol: "a",
          stackTop: "Z",
          operation: "push",
          pushSymbols: ["A"],
        },
        {
          id: "push-a",
          from: "q0",
          to: "q0",
          inputSymbol: "a",
          stackTop: "A",
          operation: "push",
          pushSymbols: ["A"],
        },
        {
          id: "first-b",
          from: "q0",
          to: "q1",
          inputSymbol: "b",
          stackTop: "A",
          operation: "pop",
        },
        {
          id: "pop-b",
          from: "q1",
          to: "q1",
          inputSymbol: "b",
          stackTop: "A",
          operation: "pop",
        },
        {
          id: "accept",
          from: "q1",
          to: "qf",
          inputSymbol: "ε",
          stackTop: "Z",
          operation: "noop",
        },
      ],
    },
  },
  {
    label: "Create PDA for balanced parentheses",
    input: "(()())",
    pda: {
      id: "balanced-parentheses",
      inputAlphabet: ["(", ")"],
      stackAlphabet: ["Z", "("],
      startState: "q0",
      acceptStates: ["qf"],
      initialStackSymbol: "Z",
      acceptanceMode: "final_state",
      states: [
        { id: "q0", label: "q0" },
        { id: "qf", label: "qf", accepting: true },
      ],
      transitions: [
        {
          id: "push",
          from: "q0",
          to: "q0",
          inputSymbol: "(",
          stackTop: "Z",
          operation: "push",
          pushSymbols: ["("],
        },
        {
          id: "push-more",
          from: "q0",
          to: "q0",
          inputSymbol: "(",
          stackTop: "(",
          operation: "push",
          pushSymbols: ["("],
        },
        {
          id: "pop",
          from: "q0",
          to: "q0",
          inputSymbol: ")",
          stackTop: "(",
          operation: "pop",
        },
        {
          id: "accept",
          from: "q0",
          to: "qf",
          inputSymbol: "ε",
          stackTop: "Z",
          operation: "noop",
        },
      ],
    },
  },
  {
    label: "Create PDA for 0ⁿ1ⁿ",
    input: "0011",
    pda: {
      id: "zero-one",
      inputAlphabet: ["0", "1"],
      stackAlphabet: ["Z", "X"],
      startState: "q0",
      acceptStates: ["qf"],
      initialStackSymbol: "Z",
      acceptanceMode: "final_state",
      states: [
        { id: "q0", label: "q0" },
        { id: "q1", label: "q1" },
        { id: "qf", label: "qf", accepting: true },
      ],
      transitions: [
        {
          id: "push-z",
          from: "q0",
          to: "q0",
          inputSymbol: "0",
          stackTop: "Z",
          operation: "push",
          pushSymbols: ["X"],
        },
        {
          id: "push-x",
          from: "q0",
          to: "q0",
          inputSymbol: "0",
          stackTop: "X",
          operation: "push",
          pushSymbols: ["X"],
        },
        {
          id: "first-one",
          from: "q0",
          to: "q1",
          inputSymbol: "1",
          stackTop: "X",
          operation: "pop",
        },
        {
          id: "pop-one",
          from: "q1",
          to: "q1",
          inputSymbol: "1",
          stackTop: "X",
          operation: "pop",
        },
        {
          id: "accept",
          from: "q1",
          to: "qf",
          inputSymbol: "ε",
          stackTop: "Z",
          operation: "noop",
        },
      ],
    },
  },
  {
    label: "Create PDA for a*b*",
    input: "aaabbb",
    pda: {
      id: "a-star-b-star",
      inputAlphabet: ["a", "b"],
      stackAlphabet: ["Z"],
      startState: "q0",
      acceptStates: ["qf"],
      initialStackSymbol: "Z",
      acceptanceMode: "final_state",
      states: [
        { id: "q0", label: "q0" },
        { id: "q1", label: "q1" },
        { id: "qf", label: "qf", accepting: true },
      ],
      transitions: [
        {
          id: "a-loop",
          from: "q0",
          to: "q0",
          inputSymbol: "a",
          stackTop: "Z",
          operation: "noop",
        },
        {
          id: "first-b",
          from: "q0",
          to: "q1",
          inputSymbol: "b",
          stackTop: "Z",
          operation: "noop",
        },
        {
          id: "b-loop",
          from: "q1",
          to: "q1",
          inputSymbol: "b",
          stackTop: "Z",
          operation: "noop",
        },
        {
          id: "accept-q0",
          from: "q0",
          to: "qf",
          inputSymbol: "ε",
          stackTop: "Z",
          operation: "noop",
        },
        {
          id: "accept-q1",
          from: "q1",
          to: "qf",
          inputSymbol: "ε",
          stackTop: "Z",
          operation: "noop",
        },
      ],
    },
  },
  {
    label: "Create PDA for ε",
    input: "",
    pda: {
      id: "empty-string",
      inputAlphabet: [],
      stackAlphabet: ["Z"],
      startState: "q0",
      acceptStates: ["qf"],
      initialStackSymbol: "Z",
      acceptanceMode: "final_state",
      states: [
        { id: "q0", label: "q0" },
        { id: "qf", label: "qf", accepting: true },
      ],
      transitions: [
        {
          id: "accept-empty",
          from: "q0",
          to: "qf",
          inputSymbol: "ε",
          stackTop: "Z",
          operation: "noop",
        },
      ],
    },
  },
];

function timelineFromPDA(pda: PDA) {
  const automaton = pdaAsAutomaton(pda);
  const drawnEdges = new Set<string>();
  return timelineFromAutomaton(automaton).map((step) => {
    if (step.action.type !== "create_transition") return step;
    const transitionId = (step.action as { transitionId: string }).transitionId;
    const transition = automaton.transitions.find(
      (item) => item.id === transitionId,
    );
    const edgeKey = transition ? transition.from + ":" + transition.to : "";
    if (!drawnEdges.has(edgeKey)) {
      drawnEdges.add(edgeKey);
      return step;
    }
    return { ...step, action: { type: "explain" as const } };
  });
}

export function PDABlock({
  pda,
  input,
  showTransitionTable = true,
  onToolExecute,
}: PDABlockProps) {
  const agent = usePDAAgentView(pda.id);
  const [localPda, setLocalPda] = useState<PDA>(pda);
  const [localExecution, setLocalExecution] = useState<PDAExecution>(() =>
    createPDAExecution(localPda, input),
  );
  const activePda = agent?.pda ?? localPda;
  const execution = agent?.execution ?? localExecution;
  const constructionPdaId = useRef<string | null>(null);
  const [construction, setConstruction] =
    useState<AutomataConstructionView | null>(null);
  const [timeline] = useState(
    () =>
      new TeachingTimeline(
        {
          prepare(_step, token) {
            timeline.narrationStarted(token);
            timeline.narrationCompleted(token);
          },
          cancel() {},
        },
        (snapshot) => {
          const pdaId = constructionPdaId.current;
          setConstruction(
            pdaId && snapshot.mode !== "idle" && snapshot.mode !== "complete"
              ? constructionView(pdaId, snapshot)
              : null,
          );
        },
      ),
  );
  const toolStateRef = useRef<PDAState>({
    selectedId: activePda.id,
    pdas: { [activePda.id]: activePda },
    executions: { [activePda.id]: createPDAExecution(activePda, input) },
  });
  const pdaTools = useMemo(
    () =>
      createPDATools({
        get state() {
          return toolStateRef.current;
        },
        commit(next) {
          toolStateRef.current = next;
        },
      }),
    [],
  );
  const graph = useMemo(() => pdaAsAutomaton(activePda), [activePda]);
  const valid = validatePDA(activePda);
  const top = execution.configurations[0];
  const graphExecution: AutomatonExecution = {
    executionId: `pda-${execution.step}`,
    automatonId: activePda.id,
    status: execution.status,
    input: execution.input,
    inputIndex: top?.inputIndex ?? 0,
    currentStates: [
      ...new Set(execution.configurations.map((item) => item.state)),
    ],
    activeTransitions: execution.activeTransitionIds,
    transitionPhase: execution.activeTransitionIds.length
      ? "traveling"
      : undefined,
    visitedStates: [],
    visitedTransitions: execution.visitedTransitionIds,
    stepIndex: execution.step,
    result: execution.result,
    steps: [],
  };
  const executeCommand = async (name: PDAToolName) => {
    const toolInput =
      name === "simulate_pda" || name === "reset_pda"
        ? { pdaId: activePda.id, input }
        : { pdaId: activePda.id };
    toolStateRef.current = {
      ...toolStateRef.current,
      selectedId: activePda.id,
      pdas: { ...toolStateRef.current.pdas, [activePda.id]: activePda },
    };
    const definition = pdaTools[name] as unknown as {
      execute: (
        input: { pdaId: string; input?: string },
        options: Record<string, never>,
      ) => Promise<unknown>;
    };
    await definition.execute(toolInput, {});
    await onToolExecute?.(name, toolInput);
    if (name === "step_pda")
      setLocalExecution((current) => stepPDA(activePda, current));
    if (name === "simulate_pda")
      setLocalExecution(simulatePDA(activePda, execution.input));
    if (name === "reset_pda")
      setLocalExecution(createPDAExecution(activePda, input));
  };

  const executeProblem = async (problem: (typeof problemCommands)[number]) => {
    if (agent?.onCreate) {
      agent.onCreate(problem.pda, problem.input);
      return;
    }
    const definition = pdaTools.create_pda as unknown as {
      execute: (
        input: Record<string, unknown>,
        options: Record<string, never>,
      ) => Promise<unknown>;
    };
    await definition.execute(
      { ...problem.pda, pdaId: problem.pda.id, input: problem.input },
      {},
    );
    await onToolExecute?.("create_pda", {
      ...problem.pda,
      pdaId: problem.pda.id,
      input: problem.input,
    });
    constructionPdaId.current = problem.pda.id;
    setLocalPda(problem.pda);
    setLocalExecution(createPDAExecution(problem.pda, problem.input));
    timeline.clear();
    timeline.load(timelineFromPDA(problem.pda));
    timeline.resume();
  };

  return (
    <section
      className="canvas-pda-block flex min-w-0 flex-col gap-4"
      aria-label="Pushdown automaton"
    >
      <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.42fr)]">
        <TransitionDiagram
          automaton={graph}
          execution={graphExecution}
          construction={construction}
          onConstructionAnimationComplete={(token) =>
            timeline.animationCompleted(token)
          }
        />
        <div className="flex flex-col justify-between rounded-xl border border-border bg-muted/20 p-3">
          <StackStrip
            data={top?.stack ?? []}
            name="Stack"
            activeIndex={top?.stack.length ? top.stack.length - 1 : undefined}
          />
          <ExecutionControls
            ariaLabel="PDA controls"
            disabled={!valid.valid}
            terminal={["accepted", "rejected", "error"].includes(
              execution.status,
            )}
            onStep={() => {
              if (agent?.onStep) agent.onStep();
              else void executeCommand("step_pda");
            }}
            onReset={() => {
              if (agent?.onReset) agent.onReset();
              else void executeCommand("reset_pda");
            }}
          />
        </div>
      </div>

      {!valid.valid ? (
        <p className="rounded-md border border-warning/30 bg-warning/10 p-2 text-sm text-warning">
          {valid.issues.join(" ")}
        </p>
      ) : null}
      <section
        aria-label="PDA problem commands"
        className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
      >
        {problemCommands.map((problem) => (
          <Button
            key={problem.pda.id}
            type="button"
            variant="outline"
            className="h-auto min-h-14 justify-start px-3 py-2 text-left"
            onClick={() => {
              void executeProblem(problem);
            }}
          >
            {problem.label}
          </Button>
        ))}
      </section>
      {showTransitionTable ? (
        <section>
          <PDATransitionTable pda={activePda} execution={execution} />
        </section>
      ) : null}
    </section>
  );
}
