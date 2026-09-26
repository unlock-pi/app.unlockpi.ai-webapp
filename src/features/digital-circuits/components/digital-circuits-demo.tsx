"use client";

import { useState } from "react";
import type { SoundName } from "cuelume";

import { CircuitView, type CircuitComponent, type CircuitWire } from "@/components/data-structure/circuit";
import { useCircuitPlayer } from "@/features/digital-circuits/hooks/use-circuit-player";
import {
  createParallelCircuit,
  createSeriesCircuit,
  evaluateGate,
  resetCircuit,
  toggleSwitch,
  type CircuitOpResult,
} from "@/features/digital-circuits/lib/circuit-ops";
import { cn } from "@/lib/utils";

/**
 * Each entry is a real thing a teacher would say, paired with the exact
 * operation it should run. There's no voice session behind this yet (see
 * the feature README) — these buttons call `circuit-ops.ts` directly, which
 * is how the board and the animation get verified independently of speech
 * recognition and a realtime connection, exactly like arrays-agent-demo.tsx
 * does for arrays.
 */
type SpokenExample = {
  said: string;
  /** Takes the board's CURRENT state, since some operations (toggling a switch) need to know what's already there. */
  run: (board: { components: CircuitComponent[]; wires: CircuitWire[] }) => CircuitOpResult;
  /** Plays the instant the command runs, before any beat has drawn — for a genuine physical action, not "the animation settled." */
  startCue?: SoundName;
};

const SPOKEN_EXAMPLES: SpokenExample[] = [
  {
    said: "Build a series circuit with a battery, a switch, a resistor and an LED.",
    run: () => createSeriesCircuit(),
    startCue: "loading",
  },
  { said: "Close the switch.", run: (board) => toggleSwitch(board.components, board.wires, "switch"), startCue: "toggle" },
  { said: "Open the switch.", run: (board) => toggleSwitch(board.components, board.wires, "switch"), startCue: "toggle" },
  {
    said: "Now show me a parallel circuit instead.",
    run: () => createParallelCircuit(),
    startCue: "loading",
  },
  { said: "Evaluate an AND gate with inputs 1 and 0.", run: () => evaluateGate("and", [true, false]) },
  { said: "Evaluate an AND gate with inputs 1 and 1.", run: () => evaluateGate("and", [true, true]) },
  { said: "Evaluate an OR gate with inputs 0 and 0.", run: () => evaluateGate("or", [false, false]) },
  { said: "Evaluate a NOT gate with input 1.", run: () => evaluateGate("not", [true]) },
  { said: "Clear the board.", run: () => resetCircuit() },
];

export function DigitalCircuitsDemo() {
  const player = useCircuitPlayer();
  const [board, setBoard] = useState<{ components: CircuitComponent[]; wires: CircuitWire[] }>({
    components: [],
    wires: [],
  });
  const [log, setLog] = useState<string[]>([]);

  const runExample = (example: SpokenExample) => {
    const result = example.run(board);
    setBoard({ components: result.components, wires: result.wires });
    player.controls.play(result.frames, { startCue: example.startCue });
    setLog((previous) => [result.summary, ...previous].slice(0, 8));
  };

  // While something is playing, the player's current beat IS the picture on
  // screen — same rule as ArraysAgentBoard. At rest, fall back to the last
  // settled board so the diagram doesn't blank out between commands.
  const view = player.frame ?? {
    components: board.components,
    wires: board.wires,
    activeComponentId: undefined,
    note: "",
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-10 sm:px-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Digital circuits — live board
        </h1>
        {/* <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          spoken-command demo, no microphone needed
        </span> */}
      </header>

      <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <div className="flex min-h-[18rem] w-full items-center justify-center">
          {view.components.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No circuit on the board. Say &ldquo;build a series circuit&rdquo; to start.
            </p>
          ) : (
            <CircuitView
              components={view.components}
              wires={view.wires}
              activeComponentId={view.activeComponentId}
            />
          )}
        </div>
        {view.note ? (
          <p className="pt-2 text-center text-sm italic text-muted-foreground">{view.note}</p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Spoken commands
          </p>
          <div className="flex flex-wrap gap-2">
            {SPOKEN_EXAMPLES.map((example) => (
              <button
                key={example.said}
                type="button"
                onClick={() => runExample(example)}
                className="rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-left text-sm text-foreground transition hover:border-border hover:bg-accent/40 active:scale-[0.98]"
              >
                &ldquo;{example.said}&rdquo;
              </button>
            ))}
          </div>
        </section>

        <aside className="grid content-start gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Results
          </p>
          {log.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing run yet.</p>
          ) : (
            log.map((text, index) => (
              <p
                key={`${index}-${text}`}
                className={cn(
                  "rounded-lg bg-muted/50 px-2 py-1 text-xs leading-relaxed text-muted-foreground",
                )}
              >
                {text}
              </p>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
