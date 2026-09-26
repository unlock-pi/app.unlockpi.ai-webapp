"use client";

/**
 * Three ways to meet this component — same idea, same reasoning, as
 * `amplitude-modulation-demo.tsx`:
 *
 *  1. Spoken commands — click a sentence, watch the junction form and then
 *     get biased. The shape a voice agent will eventually drive.
 *  2. Explore it yourself — one slider, real physics: drag the applied
 *     voltage through reverse, under the barrier, and past it, and watch
 *     the depletion region actually respond.
 *  3. At a glance — three fixed junctions (reverse/unbiased/forward) side
 *     by side, for a lesson that needs a static comparison.
 */
import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  BARRIER_VOLTAGE,
  depletionWidthFor,
  PNJunctionView,
  pnJunctionScene,
} from "@/components/data-structure/pn-junction";
import { usePNJunctionPlayer } from "@/features/pn-junction/hooks/use-pn-junction-player";
import {
  applyBias,
  bringTogether,
  formDepletionRegion,
  resetJunction,
  showChargeLabels,
  showSeparateBlocks,
  type PNResult,
} from "@/features/pn-junction/lib/pn-ops";
import { cn } from "@/lib/utils";

type SpokenExample = { said: string; run: () => PNResult };

const SPOKEN_EXAMPLES: SpokenExample[] = [
  { said: "Show me a P-type and an N-type block.", run: showSeparateBlocks },
  { said: "Bring them into contact.", run: bringTogether },
  { said: "What happens at the junction?", run: formDepletionRegion },
  { said: "Show the contact potential.", run: showChargeLabels },
  { said: "Reverse-bias it.", run: () => applyBias(-1) },
  { said: "Forward-bias it, but only 0.4 volts.", run: () => applyBias(0.4) },
  { said: "Now push past the barrier voltage.", run: () => applyBias(0.7) },
  { said: "Reset the junction.", run: resetJunction },
];

export function PNJunctionDemo() {
  const player = usePNJunctionPlayer();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-12 px-4 pb-16 sm:px-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">The pn junction</h1>
        <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          one component, three ways to use it
        </span>
      </header>

      <section className="grid gap-4">
        <SectionHeading
          eyebrow="1 — spoken commands"
          title="Say it, watch it happen"
          description="Same pattern as the arrays, circuits, and amplitude-modulation demos — each button stands in for a sentence a voice agent would eventually speak."
        />

        <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
          <div className="flex min-h-[18rem] w-full items-center justify-center">
            <PNJunctionView scene={player.scene} className="w-full" />
          </div>
          {player.scene.note ? (
            <p className="pt-2 text-center text-sm italic text-muted-foreground">{player.scene.note}</p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="grid gap-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Spoken commands</p>
            <div className="flex flex-wrap gap-2">
              {SPOKEN_EXAMPLES.map((example) => (
                <button
                  key={example.said}
                  type="button"
                  onClick={() => player.run(example.run())}
                  className="rounded-xl border border-border/60 bg-background/60 px-3 py-1.5 text-left text-sm text-foreground transition hover:border-border hover:bg-accent/40 active:scale-[0.98]"
                >
                  &ldquo;{example.said}&rdquo;
                </button>
              ))}
            </div>
          </div>

          <aside className="grid content-start gap-1.5">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Results</p>
            {player.log.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing run yet.</p>
            ) : (
              player.log.map((text, index) => (
                <p key={`${index}-${text}`} className="rounded-lg bg-muted/50 px-2 py-1 text-xs leading-relaxed text-muted-foreground">
                  {text}
                </p>
              ))
            )}
          </aside>
        </div>
      </section>

      <ExploreSection />
      <ComparisonSection />
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground/70 uppercase">{eyebrow}</span>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ExploreSection() {
  const [voltage, setVoltage] = useState(0);

  const scene = useMemo(() => {
    const depletionWidth = depletionWidthFor(voltage);
    const conducting = voltage >= BARRIER_VOLTAGE;
    return pnJunctionScene({
      proximity: 1,
      depletionWidth,
      appliedVoltage: voltage,
      schematic: 1,
      showCurrentFlow: conducting,
      note: "",
    });
  }, [voltage]);

  return (
    <section className="grid gap-4">
      <SectionHeading
        eyebrow="2 — explore it yourself"
        title="Drag the bias through all three regimes"
        description="No script here — sweep the voltage from reverse, through under-the-barrier, to fully forward, and watch the depletion region actually respond."
      />

      <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <PNJunctionView scene={scene} />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Applied voltage</Label>
          <span className="text-sm text-muted-foreground tabular-nums">{voltage.toFixed(2)}V</span>
        </div>
        <Slider
          min={-2}
          max={0.9}
          step={0.02}
          value={[voltage]}
          onValueChange={(value) => setVoltage(Array.isArray(value) ? value[0] : value)}
        />
      </div>
    </section>
  );
}

const COMPARISON_CASES = [
  { label: "Reverse-biased", voltage: -1.2 },
  { label: "Unbiased", voltage: 0 },
  { label: "Forward-biased", voltage: 0.75 },
];

function ComparisonSection() {
  return (
    <section className="grid gap-4">
      <SectionHeading
        eyebrow="3 — at a glance"
        title="Three bias states, side by side"
        description="The comparison a textbook figure would draw as three static pictures — the same junction, just fed three fixed scenes instead of one changing one."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {COMPARISON_CASES.map((example) => (
          <div key={example.label} className={cn("grid gap-2 rounded-2xl border border-border/60 bg-card/40 p-4")}>
            <p className="text-center text-sm font-medium text-foreground">{example.label}</p>
            <PNJunctionView
              showLegend={false}
              scene={pnJunctionScene({
                proximity: 1,
                depletionWidth: depletionWidthFor(example.voltage),
                appliedVoltage: example.voltage,
                schematic: 1,
                showCurrentFlow: example.voltage >= BARRIER_VOLTAGE,
                note: "",
              })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
