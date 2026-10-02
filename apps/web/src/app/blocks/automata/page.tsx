"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { InputString } from "@/components/automata/input-string";
import { TransitionDiagram } from "@/components/automata/transition-diagram";
import { TransitionTable } from "@/components/automata/transition-table";
import { createAutomatonExecution } from "@/components/automata/model";
import { useExecutionPlayback } from "@/components/automata/use-execution-playback";
import {
  createInitialAutomataState,
  selectedAutomaton,
  type AutomataAgentState,
} from "@/features/automata-agent/lib/automaton-engine-agent";
import { createAutomataTools } from "@/features/automata-agent/tools/automata-agent";
import { constructionView, type AutomataConstructionView } from "@/features/automata-agent/construction/automata-construction-agent";
import { timelineFromAutomaton } from "@/features/automata-agent/construction/trace-adapters-agent";
import { TeachingTimeline } from "@/features/toc/construction/timeline-agent";
import type { AutomataToolContext } from "@/features/automata-agent/tools/tool-context-agent";

type ToolResult = {
  tool: string;
  input: Record<string, unknown>;
  ok: boolean;
  summary: string;
};

type PlaygroundTool = {
  execute: (input: unknown, options: unknown) => Promise<{ ok?: boolean; summary?: string }>;
};

const EXAMPLES = [
  {
    prompt: "Create a DFA with 2 states over {0, 1}.",
    input: {
      type: "dfa", automatonId: "two-state-dfa", alphabet: ["0", "1"],
      states: ["q0", { id: "q1", accepting: true }], startState: "q0", acceptStates: ["q1"],
      transitions: [
        { id: "t00", from: "q0", to: "q0", symbols: ["0"] },
        { id: "t01", from: "q0", to: "q1", symbols: ["1"] },
        { id: "t10", from: "q1", to: "q0", symbols: ["0"] },
        { id: "t11", from: "q1", to: "q1", symbols: ["1"] },
      ], input: "01",
    },
  },
  {
    prompt: "Create a DFA which accepts an odd number of 0s.",
    input: {
      type: "dfa", automatonId: "odd-zeros", alphabet: ["0", "1"],
      states: ["qEven", { id: "qOdd", accepting: true }], startState: "qEven", acceptStates: ["qOdd"],
      transitions: [
        { id: "zero-even", from: "qEven", to: "qOdd", symbols: ["0"] },
        { id: "one-even", from: "qEven", to: "qEven", symbols: ["1"] },
        { id: "zero-odd", from: "qOdd", to: "qEven", symbols: ["0"] },
        { id: "one-odd", from: "qOdd", to: "qOdd", symbols: ["1"] },
      ], input: "10101",
    },
  },
  {
    prompt: "Create an NFA that accepts strings ending in 01.",
    input: {
      type: "nfa", automatonId: "ends-in-01", alphabet: ["0", "1"],
      states: ["q0", "q1", { id: "q2", accepting: true }], startState: "q0", acceptStates: ["q2"],
      transitions: [
        { id: "loop", from: "q0", to: "q0", symbols: ["0", "1"] },
        { id: "guess-zero", from: "q0", to: "q1", symbols: ["0"] },
        { id: "finish", from: "q1", to: "q2", symbols: ["1"] },
      ], input: "1101",
    },
  },

  {
    prompt: "Create a DFA which accepts an even number of 0s.",
    input: {
      type: "dfa", automatonId: "even-zeros", alphabet: ["0", "1"],
      states: [{ id: "qEven", accepting: true }, "qOdd"], startState: "qEven", acceptStates: ["qEven"],
      transitions: [
        { id: "zero-even", from: "qEven", to: "qOdd", symbols: ["0"] },
        { id: "one-even", from: "qEven", to: "qEven", symbols: ["1"] },
        { id: "zero-odd", from: "qOdd", to: "qEven", symbols: ["0"] },
        { id: "one-odd", from: "qOdd", to: "qOdd", symbols: ["1"] },
      ], input: "10010",
    },
  },
  {
    prompt: "Create a DFA that accepts strings ending in 01.",
    input: {
      type: "dfa", automatonId: "dfa-ends-in-01", alphabet: ["0", "1"],
      states: ["q0", "q1", { id: "q2", accepting: true }], startState: "q0", acceptStates: ["q2"],
      transitions: [
        { id: "q0-zero", from: "q0", to: "q1", symbols: ["0"] },
        { id: "q0-one", from: "q0", to: "q0", symbols: ["1"] },
        { id: "q1-zero", from: "q1", to: "q1", symbols: ["0"] },
        { id: "q1-one", from: "q1", to: "q2", symbols: ["1"] },
        { id: "q2-zero", from: "q2", to: "q1", symbols: ["0"] },
        { id: "q2-one", from: "q2", to: "q0", symbols: ["1"] },
      ], input: "10101",
    },
  },
  {
    prompt: "Create a DFA that accepts strings containing 101.",
    input: {
      type: "dfa", automatonId: "contains-101", alphabet: ["0", "1"],
      states: ["q0", "q1", "q2", { id: "q3", accepting: true }], startState: "q0", acceptStates: ["q3"],
      transitions: [
        { id: "q0-zero", from: "q0", to: "q0", symbols: ["0"] },
        { id: "q0-one", from: "q0", to: "q1", symbols: ["1"] },
        { id: "q1-zero", from: "q1", to: "q2", symbols: ["0"] },
        { id: "q1-one", from: "q1", to: "q1", symbols: ["1"] },
        { id: "q2-zero", from: "q2", to: "q0", symbols: ["0"] },
        { id: "q2-one", from: "q2", to: "q3", symbols: ["1"] },
        { id: "q3-loop", from: "q3", to: "q3", symbols: ["0", "1"] },
      ], input: "001011",
    },
  },
  {
    prompt: "Create an NFA that accepts strings containing ab.",
    input: {
      type: "nfa", automatonId: "contains-ab", alphabet: ["a", "b"],
      states: ["q0", "q1", { id: "q2", accepting: true }], startState: "q0", acceptStates: ["q2"],
      transitions: [
        { id: "search", from: "q0", to: "q0", symbols: ["a", "b"] },
        { id: "choose-a", from: "q0", to: "q1", symbols: ["a"] },
        { id: "finish-ab", from: "q1", to: "q2", symbols: ["b"] },
        { id: "after-match", from: "q2", to: "q2", symbols: ["a", "b"] },
      ], input: "baabb",
    },
  },
  {
    prompt: "Create an ε-NFA that accepts a*.",
    input: {
      type: "nfa", automatonId: "epsilon-a-star", alphabet: ["a"],
      states: ["q0", { id: "q1", accepting: true }], startState: "q0", acceptStates: ["q1"],
      transitions: [
        { id: "epsilon-start", from: "q0", to: "q1", symbols: ["ε"] },
        { id: "repeat-a", from: "q1", to: "q1", symbols: ["a"] },
      ], input: "aaa",
    },
  },
  {
    prompt: "Test an invalid DFA with two 0-transitions from the start state.",
    input: {
      type: "dfa", automatonId: "invalid-duplicate-zero", alphabet: ["0", "1"],
      states: ["q0", { id: "q1", accepting: true }], startState: "q0", acceptStates: ["q1"],
      transitions: [
        { id: "first-zero", from: "q0", to: "q0", symbols: ["0"] },
        { id: "second-zero", from: "q0", to: "q1", symbols: ["0"] },
        { id: "one", from: "q0", to: "q1", symbols: ["1"] },
        { id: "loop", from: "q1", to: "q1", symbols: ["0", "1"] },
      ], input: "0",
    },
  },
] as const;

export default function AutomataTestPage() {
  const stateRef = useRef<AutomataAgentState>(createInitialAutomataState());
  const [state, setState] = useState<AutomataAgentState>(() => structuredClone(stateRef.current));
  const [, setResults] = useState<ToolResult[]>([]);
  const [input, setInput] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [construction, setConstruction] = useState<AutomataConstructionView | null>(null);
  const constructionAutomatonIdRef = useRef<string | null>(null);
  const [timeline] = useState(() => new TeachingTimeline({
    prepare(_step, token) {
      // This playground is deliberately voice-free: narration is acknowledged immediately.
      // The graph animation must still finish before the next step begins.
      timeline.narrationStarted(token);
      timeline.narrationCompleted(token);
    },
    cancel() {},
  }, (snapshot) => {
    const automatonId = constructionAutomatonIdRef.current;
    setConstruction(automatonId && snapshot.mode !== "idle" && snapshot.mode !== "complete"
      ? constructionView(automatonId, snapshot)
      : null);
  }));
  const onConstructionAnimationComplete = useCallback((token: string) => {
    timeline.animationCompleted(token);
  }, [timeline]);

  const context = useMemo<AutomataToolContext>(() => ({
    get state() { return stateRef.current; },
    commit(next) {
      stateRef.current = structuredClone(next);
      setState(structuredClone(next));
    },
  }), []);
  const tools = useMemo(() => createAutomataTools(context), [context]);
  const automaton = selectedAutomaton(state);
  const execution = automaton
    ? state.executions[automaton.id] ?? createAutomatonExecution(automaton, input)
    : null;
  const { displayedExecution, flowProgress } = useExecutionPlayback(
    execution ?? createAutomatonExecution({ id: "empty", type: "dfa", alphabet: [], states: [], transitions: [], startState: "", acceptStates: [] }),
  );

  const invoke = useCallback(async (toolName: keyof typeof tools, toolInput: Record<string, unknown>) => {
    const definition = tools[toolName] as unknown as PlaygroundTool;
    const outcome = await definition.execute(toolInput, {});
    setResults((current) => [{ tool: String(toolName), input: toolInput, ok: outcome.ok !== false, summary: outcome.summary ?? "Tool completed." }, ...current].slice(0, 8));
    return outcome;
  }, [tools]);

  const runExample = useCallback(async (example: (typeof EXAMPLES)[number]) => {
    timeline.clear();
    constructionAutomatonIdRef.current = null;
    setConstruction(null);
    setIsPreparing(true);
    const fresh = createInitialAutomataState();
    stateRef.current = fresh;
    setState(structuredClone(fresh));
    setResults([]);
    setInput(example.input.input);
    try {
      const outcome = await invoke("create_automaton", example.input);
      if (outcome.ok === false) return;
      const created = selectedAutomaton(stateRef.current);
      if (!created) throw new Error("The tool did not create an automaton.");
      constructionAutomatonIdRef.current = created.id;
      timeline.load(timelineFromAutomaton(created));
      timeline.resume();
      setIsPreparing(false);
      await invoke("validate_automaton", { automatonId: created.id });
    } catch (error) {
      setResults((current) => [{
        tool: "construction", input: { automatonId: example.input.automatonId }, ok: false,
        summary: error instanceof Error ? error.message : "Could not animate construction.",
      }, ...current].slice(0, 8));
    } finally {
      setIsPreparing(false);
    }
  }, [invoke, timeline]);

  const reset = useCallback(() => {
    timeline.clear();
    constructionAutomatonIdRef.current = null;
    setConstruction(null);
    setIsPreparing(false);
    const fresh = createInitialAutomataState();
    stateRef.current = fresh;
    setState(structuredClone(fresh));
    setResults([]);
    setInput("");
  }, [timeline]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 rounded-2xl border border-border bg-card/40 p-4 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Automata playground</p>
          {/* <h1 className="mt-1 text-2xl font-semibold">Direct tool-call testing</h1>
          <p className="mt-2 text-sm text-muted-foreground">No agent or AI is connected. Each command below invokes the existing deterministic automata tools locally.</p> */}

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {EXAMPLES.map((example) => (
              <button key={example.input.automatonId} type="button" disabled={isPreparing} onClick={() => void runExample(example)} className="rounded-xl border border-border bg-background/60 p-3 text-left transition hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99]">
                <span className="block text-sm font-medium">{example.prompt}</span>
                {/* <code className="mt-2 block text-xs text-muted-foreground">create_automaton(...)</code> */}
              </button>
            ))}
          </div>

          {automaton && execution && !isPreparing ? (
            <section className="mt-6 min-w-0" aria-label="Automata tool result">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{automaton.id} · {automaton.type.toUpperCase()}</h2>
                  {construction ? <p className="text-xs text-primary" aria-live="polite">
                    Drawing {construction.timeline.currentStep + 1} / {construction.timeline.steps.length} · {construction.timeline.steps[construction.timeline.currentStep]?.narration}
                  </p> : null}
                </div>
                <button type="button" onClick={reset} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">Clear playground</button>
              </div>
              <TransitionDiagram automaton={automaton} execution={displayedExecution} flowProgress={flowProgress} construction={construction} onConstructionAnimationComplete={onConstructionAnimationComplete} viewportClassName="h-[24rem]" />
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground" htmlFor="automata-input">Input</label>
                  <input id="automata-input" value={input} onChange={(event) => setInput(event.target.value)} className="mt-1 block rounded-md border border-border bg-background px-3 py-2 text-sm" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={Boolean(construction)} onClick={() => void invoke("reset_execution", { input })} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Reset execution</button>
                  <button type="button" disabled={Boolean(construction)} onClick={() => void invoke("step_execution", { input })} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Step tool</button>
                  <button type="button" disabled={Boolean(construction)} onClick={() => void invoke("simulate_automaton", { input })} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Simulate tool</button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <InputString symbols={[...input]} currentIndex={displayedExecution.inputIndex} />
                <p className="text-xs text-muted-foreground">
                  Active states: {"{"}{displayedExecution.currentStates.map((stateId) => automaton.states.find((state) => state.id === stateId)?.label ?? stateId).join(", ")}{"}"}
                  {automaton.type === "nfa" && displayedExecution.currentStates.length > 1 ? " · valid NFA branch set" : ""}
                </p>
              </div>
              {!construction ? <section className="mt-5"><TransitionTable automaton={automaton} execution={displayedExecution} /></section> : null}
            </section>
          ) : (
            <div className="mt-6 grid h-[28rem] place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">{isPreparing ? "Preparing the construction…" : "Choose a clickable command to create an automaton."}</div>
          )}
        </section>

        
      </div>
    </main>
  );
}
