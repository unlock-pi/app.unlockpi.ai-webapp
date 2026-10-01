"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import {
  RegularExpressionAgentViewProvider,
  RegularExpressionBlock,
} from "@/components/regular-expression";
import {
  constructionView,
  validateConstructionPlan,
  type AutomataConstructionView,
} from "@/features/automata-agent/construction/automata-construction-agent";
import { timelineFromAutomaton } from "@/features/automata-agent/construction/trace-adapters-agent";
import {
  createInitialRegularExpressionAgentState,
  selectedRegularExpressionAutomaton,
  type RegularExpressionAgentState,
} from "@/features/regular-expression-agent/lib/agent-state-agent";
import {
  createRegularExpressionTools,
  type RegularExpressionToolName,
} from "@/features/regular-expression-agent/tools/regular-expression-agent";
import type { RegularExpressionToolContext } from "@/features/regular-expression-agent/tools/tool-context-agent";
import { TeachingTimeline } from "@/features/toc/construction/timeline-agent";
import { PlaybackCoordinator } from "@/features/regular-expression-agent/lib/playback-coordinator-agent";
import { cn } from "@/lib/utils";

type Example = {
  prompt: string;
  expression: string;
  input: string;
  mode: "expression" | "nfa" | "dfa" | "validate";
};

type ToolResult = {
  tool: string;
  input: Record<string, unknown>;
  ok: boolean;
  summary: string;
};

type LocalTool = {
  execute: (input: unknown, options: unknown) => Promise<{ ok: boolean; summary: string }>;
};

const BLOCK_ID = "regular-expression-playground";

const EXAMPLES: Example[] = [
  { prompt: "Create the expression (a|b)*abb.", expression: "(a|b)*abb", input: "aabb", mode: "expression" },
  { prompt: "Construct an ε-NFA for (a|b)*abb.", expression: "(a|b)*abb", input: "aabb", mode: "nfa" },
  { prompt: "Create only a DFA for (a|b)*abb.", expression: "(a|b)*abb", input: "aabb", mode: "dfa" },
  { prompt: "Construct an ε-NFA for a*.", expression: "a*", input: "aaa", mode: "nfa" },
  { prompt: "Create only a DFA for a|b.", expression: "a|b", input: "a", mode: "dfa" },
  { prompt: "Construct an ε-NFA for ε|a.", expression: "ε|a", input: "", mode: "nfa" },
  { prompt: "Check why (a| is invalid.", expression: "(a|", input: "", mode: "validate" },
];

export default function RegularExpressionTestPage() {
  const stateRef = useRef<RegularExpressionAgentState>(
    createInitialRegularExpressionAgentState(BLOCK_ID),
  );
  const [state, setState] = useState<RegularExpressionAgentState>(
    () => structuredClone(stateRef.current),
  );
  const [results, setResults] = useState<ToolResult[]>([]);
  const [input, setInput] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [isPlaybackPending, setIsPlaybackPending] = useState(false);
  const pendingPlaybackCallsRef = useRef(0);
  const visualGenerationRef = useRef(0);
  const [playback] = useState(() => new PlaybackCoordinator());
  const [construction, setConstruction] = useState<AutomataConstructionView | null>(null);
  const constructionAutomatonIdRef = useRef<string | null>(null);
  const holdGraphCommitRef = useRef(false);

  const [timeline] = useState(() => new TeachingTimeline({
    prepare(_step, token) {
      // This route has no voice. Visual completion still gates the next step.
      timeline.narrationStarted(token);
      timeline.narrationCompleted(token);
    },
    cancel() {},
  }, (snapshot) => {
    const automatonId = constructionAutomatonIdRef.current;
    setConstruction(
      automatonId && snapshot.mode !== "idle" && snapshot.mode !== "complete"
        ? constructionView(automatonId, snapshot)
        : null,
    );
  }));

  const context = useMemo<RegularExpressionToolContext>(() => ({
    get state() { return stateRef.current; },
    commit(next) {
      stateRef.current = structuredClone(next);
      if (!holdGraphCommitRef.current) setState(structuredClone(next));
    },
  }), []);
  const tools = useMemo(() => createRegularExpressionTools(context), [context]);

  const invoke = useCallback(async (
    toolName: RegularExpressionToolName,
    toolInput: Record<string, unknown> = {},
  ) => {
    const definition = tools[toolName] as unknown as LocalTool;
    const outcome = await definition.execute(toolInput, {});
    setResults((current) => [{
      tool: toolName,
      input: toolInput,
      ok: outcome.ok,
      summary: outcome.summary,
    }, ...current].slice(0, 8));
    return outcome;
  }, [tools]);

  const onConstructionAnimationComplete = useCallback((token: string) => {
    timeline.animationCompleted(token);
  }, [timeline]);
  const onPlaybackComplete = useCallback((executionId: string, stepCount: number) => {
    playback.report(executionId, stepCount);
  }, [playback]);
  const runVisualTool = useCallback(async (
    toolName: "step_execution" | "simulate_automaton",
    toolInput: { input: string },
  ) => {
    const generation = visualGenerationRef.current;
    pendingPlaybackCallsRef.current += 1;
    setIsPlaybackPending(true);
    try {
      await playback.run(async () => {
        const before = stateRef.current.view.generatedAutomatonExecution;
        const outcome = await invoke(toolName, toolInput);
        const after = stateRef.current.view.generatedAutomatonExecution;
        if (outcome.ok && after && after.steps.length && (
          after.executionId !== before?.executionId ||
          after.steps.length > (before?.steps.length ?? 0)
        )) {
          await playback.wait(after.executionId, after.steps.length);
        }
      });
    } catch (error) {
      if (!(error instanceof Error && error.message === "Playback was cancelled.")) {
        setResults((current) => [{
          tool: toolName, input: toolInput, ok: false,
          summary: error instanceof Error ? error.message : "Execution playback failed.",
        }, ...current].slice(0, 8));
      }
    } finally {
      if (generation === visualGenerationRef.current) {
        pendingPlaybackCallsRef.current = Math.max(0, pendingPlaybackCallsRef.current - 1);
        if (pendingPlaybackCallsRef.current === 0) setIsPlaybackPending(false);
      }
    }
  }, [invoke, playback]);

  const reset = useCallback(() => {
    playback.cancel();
    visualGenerationRef.current += 1;
    pendingPlaybackCallsRef.current = 0;
    setIsPlaybackPending(false);
    timeline.clear();
    constructionAutomatonIdRef.current = null;
    holdGraphCommitRef.current = false;
    setConstruction(null);
    setIsPreparing(false);
    const fresh = createInitialRegularExpressionAgentState(BLOCK_ID);
    stateRef.current = fresh;
    setState(structuredClone(fresh));
    setResults([]);
    setInput("");
  }, [playback, timeline]);

  const runExample = useCallback(async (example: Example) => {
    reset();
    setIsPreparing(true);
    setInput(example.input);
    try {
      if (example.mode === "validate") {
        await invoke("validate_regular_expression", { expression: example.expression });
        return;
      }
      const created = await invoke("create_regular_expression", { expression: example.expression });
      if (!created.ok || example.mode === "expression") return;

      // Keep the expression/tree visible while the graph tool runs. Publish its
      // completed model only together with the first construction frame.
      holdGraphCommitRef.current = true;
      const toolName = example.mode === "dfa" ? "convert_nfa_to_dfa" : "construct_epsilon_nfa";
      const generated = await invoke(toolName);
      if (!generated.ok) return;
      const automaton = selectedRegularExpressionAutomaton(stateRef.current);
      if (!automaton) throw new Error("The tool did not produce an automaton.");
      await invoke("reset_execution", { input: example.input });

      const steps = timelineFromAutomaton(automaton);
      validateConstructionPlan(automaton, steps);
      constructionAutomatonIdRef.current = automaton.id;
      timeline.load(steps);
      timeline.resume();
      holdGraphCommitRef.current = false;
      setState(structuredClone(stateRef.current));
    } catch (error) {
      setResults((current) => [{
        tool: "construction",
        input: { expression: example.expression },
        ok: false,
        summary: error instanceof Error ? error.message : "Could not animate the generated automaton.",
      }, ...current].slice(0, 8));
    } finally {
      holdGraphCommitRef.current = false;
      setIsPreparing(false);
    }
  }, [invoke, reset, timeline]);

  const automaton = selectedRegularExpressionAutomaton(state);
  const onStep = useCallback(() => {
    if (construction || !selectedRegularExpressionAutomaton(stateRef.current)) return;
    void runVisualTool("step_execution", { input });
  }, [construction, input, runVisualTool]);
  const onReset = useCallback(() => {
    if (construction || !selectedRegularExpressionAutomaton(stateRef.current)) return;
    playback.cancel();
    visualGenerationRef.current += 1;
    pendingPlaybackCallsRef.current = 0;
    setIsPlaybackPending(false);
    void invoke("reset_execution", { input });
  }, [construction, input, invoke, playback]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto grid w-full max-w-[100rem] gap-6 2xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 rounded-2xl border border-border bg-card/40 p-4 sm:p-6">
         

          <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {EXAMPLES.map((example) => (
              <button
                key={example.prompt}
                type="button"
                disabled={isPreparing}
                onClick={() => void runExample(example)}
                className="rounded-xl border border-border bg-background/60 p-3 text-left transition hover:border-primary/60 hover:bg-primary/5 active:scale-[0.99] disabled:opacity-50"
              >
                <span className="block text-sm font-medium">{example.prompt}</span>
                <code className="mt-2 block text-xs text-muted-foreground">
                  {example.mode === "validate"
                    ? "validate_regular_expression"
                    : example.mode === "expression"
                      ? "create_regular_expression"
                      : example.mode === "dfa"
                        ? "create_regular_expression → convert_nfa_to_dfa"
                        : "create_regular_expression → construct_epsilon_nfa"}
                </code>
              </button>
            ))}
          </div>

          {state.expression ? (
            <section className="mt-6 min-w-0" aria-label="Regular expression tool result">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">RE · {state.expression.source}</h2>
                  {construction ? (
                    <p className="text-xs text-primary" aria-live="polite">
                      Drawing {construction.timeline.currentStep + 1} / {construction.timeline.steps.length}
                      {" · "}{construction.timeline.steps[construction.timeline.currentStep]?.narration}
                    </p>
                  ) : null}
                </div>
                <button type="button" onClick={reset} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
                  Clear playground
                </button>
              </div>
              <RegularExpressionAgentViewProvider
                blockId={BLOCK_ID}
                state={state.view}
                onStep={onStep}
                onReset={onReset}
                onPlaybackComplete={onPlaybackComplete}
                automatonConstruction={construction}
                onConstructionAnimationComplete={onConstructionAnimationComplete}
              >
                <div className="[&>.canvas-regular-expression-block]:min-h-[34rem] xl:[&>.canvas-regular-expression-block]:h-[36rem]">
                  <RegularExpressionBlock
                    id={BLOCK_ID}
                    expression={state.expression.source}
                    input={state.view.input ?? ""}
                  />
                </div>
              </RegularExpressionAgentViewProvider>
              <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground" htmlFor="re-test-input">
                    Input for execution
                  </label>
                  <input
                    id="re-test-input"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    className="mt-1 block rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
                  />
                </div>
                <button
                  type="button"
                  disabled={!automaton || Boolean(construction) || isPreparing || isPlaybackPending}
                  onClick={() => void runVisualTool("simulate_automaton", { input })}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Simulate tool
                </button>
              </div>
            </section>
          ) : (
            <div className="mt-6 grid h-[30rem] place-items-center rounded-xl border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
              {isPreparing ? "Preparing the expression…" : "Choose a clickable command to create or validate a regular expression."}
            </div>
          )}
        </section>

        <aside className="rounded-2xl border border-border bg-card/40 p-4 sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tool calls</h2>
          <p className="mt-2 text-xs text-muted-foreground">Actual local inputs and results.</p>
          <div className="mt-4 grid gap-3">
            {results.length ? results.map((result, index) => (
              <article key={`${result.tool}-${index}`} className={cn(
                "rounded-lg border p-3",
                result.ok ? "border-border bg-background/50" : "border-destructive/40 bg-destructive/5",
              )}>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-semibold text-primary">{result.tool}</code>
                  <span className="text-[11px] text-muted-foreground">{result.ok ? "success" : "failed"}</span>
                </div>
                <pre className="mt-2 max-h-36 overflow-auto whitespace-pre-wrap break-words text-[11px] text-muted-foreground">
                  {JSON.stringify(result.input, null, 2)}
                </pre>
                <p className="mt-2 text-xs">{result.summary}</p>
              </article>
            )) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                No tools invoked yet.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
