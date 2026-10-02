"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ContextFreeGrammarAgentViewProvider,
  ContextFreeGrammarBlock,
  DEFAULT_CFG_PROPS,
  GrammarEditor,
  type ContextFreeGrammar,
} from "@unlockpi/blocks/context-free-grammar";
import {
  deriveString,
  validateGrammar,
  type GrammarDerivation,
} from "@/features/context-free-grammar/grammar-engine";

const BLOCK_ID = "cfg-playground";
const PRESETS: Array<{ label: string; description: string; grammar: ContextFreeGrammar; input: string }> = [
  {
    label: "aⁿbⁿ",
    description: "Equal numbers of a and b, in order",
    grammar: DEFAULT_CFG_PROPS.grammar,
    input: "aabb",
  },
  {
    label: "Balanced parentheses",
    description: "Nested and adjacent pairs",
    grammar: {
      variables: ["S"],
      terminals: ["(", ")"],
      startSymbol: "S",
      productions: [
        { id: "p0", lhs: "S", rhs: ["(", "S", ")", "S"] },
        { id: "p1", lhs: "S", rhs: [] },
      ],
    },
    input: "(())",
  },
  {
    label: "Palindromes",
    description: "Read the same from both ends",
    grammar: {
      variables: ["S"],
      terminals: ["a", "b"],
      startSymbol: "S",
      productions: [
        { id: "p0", lhs: "S", rhs: ["a", "S", "a"] },
        { id: "p1", lhs: "S", rhs: ["b", "S", "b"] },
        { id: "p2", lhs: "S", rhs: ["a"] },
        { id: "p3", lhs: "S", rhs: ["b"] },
        { id: "p4", lhs: "S", rhs: [] },
      ],
    },
    input: "abba",
  },
];

function initialDerivation() {
  const result = deriveString(PRESETS[0].grammar, PRESETS[0].input);
  return result.success ? result.value : null;
}

export default function ContextFreeGrammarPlaygroundPage() {
  const [grammar, setGrammar] = useState<ContextFreeGrammar>(PRESETS[0].grammar);
  const [input, setInput] = useState(PRESETS[0].input);
  const [derivation, setDerivation] = useState<GrammarDerivation | null>(initialDerivation);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(PRESETS[0].label);
  const [feedback, setFeedback] = useState("Derivation found. Step through the parse tree.");
  const [rejected, setRejected] = useState(false);
  const [visibility, setVisibility] = useState({ grammar: true, derivation: true, tree: true, input: true });

  const validation = useMemo(() => validateGrammar(grammar), [grammar]);
  const steps = derivation?.steps ?? [];
  const lastStep = Math.max(0, steps.length - 1);

  const clearDerivation = useCallback(() => {
    setDerivation(null);
    setStep(0);
    setPlaying(false);
    setRejected(false);
    setFeedback("Run Derive to update the visualisation.");
  }, []);

  const loadPreset = (preset: (typeof PRESETS)[number]) => {
    const result = deriveString(preset.grammar, preset.input);
    setGrammar(preset.grammar);
    setInput(preset.input);
    setDerivation(result.success ? result.value : null);
    setStep(0);
    setPlaying(false);
    setRejected(false);
    setSelectedPreset(preset.label);
    setFeedback(result.success ? "Derivation found. Step through the parse tree." : result.error.message);
  };

  const runDerivation = () => {
    setPlaying(false);
    setStep(0);
    const result = deriveString(grammar, input);
    if (result.success) {
      setDerivation(result.value);
      setRejected(false);
      setFeedback(`Derivation found in ${result.value.steps.length - 1} production steps.`);
    } else {
      setDerivation(null);
      setRejected(result.error.code === "STRING_NOT_DERIVABLE");
      setFeedback(result.error.message);
    }
  };

  useEffect(() => {
    if (!playing || !derivation) return;
    if (step >= lastStep) return;
    const timer = window.setTimeout(() => {
      setStep((current) => Math.min(current + 1, lastStep));
      if (step + 1 >= lastStep) setPlaying(false);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [playing, derivation, step, lastStep]);

  const view = {
    grammar,
    input,
    inputSymbols: derivation?.inputSymbols ?? [...input],
    derivationSteps: steps,
    parseTree: derivation?.parseTree ?? null,
    currentDerivationStep: step,
    result: rejected ? "rejected" as const : derivation && step === lastStep ? "accepted" as const : "unknown" as const,
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Context-free grammar playground</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a grammar, edit its productions, and derive an input to see each step and its parse tree.</p>
        </div>

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Example grammars">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => loadPreset(preset)}
              aria-pressed={selectedPreset === preset.label}
              className={`rounded-xl border p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 ${selectedPreset === preset.label ? "border-primary/60 bg-primary/5" : "border-border bg-card/50"}`}
            >
              <span className="block text-sm font-semibold">{preset.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{preset.description}</span>
            </button>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
            <ContextFreeGrammarAgentViewProvider
              blockId={BLOCK_ID}
              state={view}
              onStep={() => { setPlaying(false); setStep((current) => Math.min(current + 1, lastStep)); }}
              onReset={() => { setPlaying(false); setStep(0); }}
            >
              <div className="[&>.canvas-context-free-grammar-block]:min-h-[32rem]">
                <ContextFreeGrammarBlock
                  id={BLOCK_ID}
                  grammar={grammar}
                  input={input}
                  derivationSteps={steps}
                  parseTree={derivation?.parseTree ?? null}
                  showGrammar={visibility.grammar}
                  showDerivation={visibility.derivation}
                  showParseTree={visibility.tree}
                  showInput={visibility.input}
                />
              </div>
            </ContextFreeGrammarAgentViewProvider>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/50 p-3">
              <button type="button" disabled={!derivation || step === 0} onClick={() => { setPlaying(false); setStep((current) => Math.max(0, current - 1)); }} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40">Previous</button>
              <button type="button" disabled={!derivation || step >= lastStep} onClick={() => setPlaying((current) => !current)} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40">{playing ? "Pause" : "Play"}</button>
              <button type="button" disabled={!derivation} onClick={() => { setPlaying(false); setStep(0); }} className="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40">Reset</button>
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">{derivation ? `Step ${step} of ${lastStep}` : "No derivation"}</span>
            </div>
          </div>

          <aside className="space-y-5 rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold">Grammar editor</h2>
              <p className="mt-1 text-xs text-muted-foreground">Separate symbols in a production with spaces. Leave its right side empty for ε.</p>
            </div>
            <GrammarEditor value={grammar} onChange={(next) => { setGrammar(next); setSelectedPreset(null); clearDerivation(); }} />

            <div className="space-y-2">
              <label htmlFor="cfg-input" className="block text-xs font-semibold">Input string</label>
              <input
                id="cfg-input"
                value={input}
                onChange={(event) => { setInput(event.target.value); setSelectedPreset(null); clearDerivation(); }}
                placeholder="Leave empty for ε"
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Use plain characters for one-character terminals; separate longer terminals with spaces.</p>
            </div>

            <button type="button" onClick={runDerivation} disabled={!validation.valid} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Derive input</button>
            <div aria-live="polite" className={`rounded-lg border p-3 text-sm ${!validation.valid || rejected ? "border-destructive/40 bg-destructive/5" : "border-border bg-background/50"}`}>
              {!validation.valid ? validation.errors[0].message : feedback}
            </div>

            <fieldset className="space-y-2 border-t border-border pt-4">
              <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Show in block</legend>
              {([ ["grammar", "Productions"], ["derivation", "Derivation"], ["tree", "Parse tree"], ["input", "Input"] ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={visibility[key]} onChange={(event) => setVisibility((current) => ({ ...current, [key]: event.target.checked }))} />
                  {label}
                </label>
              ))}
            </fieldset>
          </aside>
        </div>
      </div>
    </main>
  );
}
