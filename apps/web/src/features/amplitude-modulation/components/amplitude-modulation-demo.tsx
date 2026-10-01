"use client";

/**
 * Three ways to meet this component, on one page:
 *
 *  1. Spoken commands  — the same "click a sentence, watch it happen" demo
 *     as /test/digital-circuits, proving this drives from a voice-agent-shaped
 *     command just as well as from a click.
 *  2. Explore it yourself — direct sliders/switches, no script. This is the
 *     "let a student break it" mode: drag μ past 1 and watch over-modulation
 *     happen under your own hand, not on a rail.
 *  3. At a glance — three fixed scopes (under/ideal/over) side by side, for
 *     the moment a lesson needs a static comparison rather than a story.
 *
 * All three are the same `WaveformView` fed different `WaveformScene`s —
 * nothing here is a special case of the component, which is the point: a
 * lesson author gets to pick whichever of these three shapes fits the
 * moment, without learning three different APIs.
 */
import { useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  modulateAt,
  resetWaveform,
  showCarrierWave,
  showMessageWave,
  showSpectrumAt,
  useWaveformPlayer,
  waveformScene,
  WaveformView,
  type AMResult,
  type WaveformVisibility,
} from "@unlockpi/blocks/waveform";
import { cn } from "@/lib/utils";

type SpokenExample = { said: string; run: () => AMResult };

const SPOKEN_EXAMPLES: SpokenExample[] = [
  { said: "Show me the carrier wave.", run: showCarrierWave },
  { said: "Now show the message signal.", run: showMessageWave },
  { said: "Modulate the carrier with it.", run: () => modulateAt(0.5) },
  { said: "Push the modulation index to 1 — full modulation.", run: () => modulateAt(1) },
  { said: "Now over-modulate it.", run: () => modulateAt(1.6) },
  { said: "Show me the frequency spectrum.", run: () => showSpectrumAt(0.5) },
  { said: "Clear the scope.", run: resetWaveform },
];

export function AmplitudeModulationDemo() {
  const player = useWaveformPlayer();

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-12 px-4 pb-16 sm:px-8">
      <header className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Amplitude modulation — live scope
        </h1>
        {/* <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          one component, three ways to use it
        </span> */}
      </header>

      <section className="grid gap-4">
        {/* <SectionHeading
          eyebrow="1 — spoken commands"
          title="Say it, watch it happen"
          description="Same pattern as the arrays and circuits demos — each button stands in for a sentence a voice agent would eventually speak."
        /> */}

        <div className="rounded-2xl border border-border/60 bg-card/40 p">
          <div className="flex min-h-[18rem] w-full items-center justify-center">
            <WaveformView scene={player.scene} className="w-full" />
          </div>
          {player.scene.note ? (
            <p className="pt-2 text-center text-sm italic text-muted-foreground">
              {player.scene.note}
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="grid gap-2">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Spoken commands
            </p>
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

          {/* <aside className="grid content-start gap-1.5">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Results
            </p>
            {player.log.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing run yet.</p>
            ) : (
              player.log.map((text, index) => (
                <p
                  key={`${index}-${text}`}
                  className="rounded-lg bg-muted/50 px-2 py-1 text-xs leading-relaxed text-muted-foreground"
                >
                  {text}
                </p>
              ))
            )}
          </aside> */}
        </div>
      </section>

      <ExploreSection />
      <ComparisonSection />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="grid gap-1">
      {eyebrow && (
        <span className="text-xs font-semibold tracking-[0.2em] text-muted-foreground/70 uppercase">
          {eyebrow}
        </span>
      )}
      {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

const ALL_VISIBLE: WaveformVisibility = {
  carrier: true,
  message: true,
  modulated: true,
  envelope: true,
  spectrum: false,
};

function ExploreSection() {
  const [modulationIndex, setModulationIndex] = useState(0.5);
  const [messageFrequency, setMessageFrequency] = useState(1);
  const [visible, setVisible] = useState<WaveformVisibility>(ALL_VISIBLE);

  const scene = useMemo(
    () =>
      waveformScene({
        carrierFrequency: 10,
        messageFrequency,
        modulationIndex,
        visible,
        note: "",
      }),
    [modulationIndex, messageFrequency, visible],
  );

  const setTrace = (key: keyof WaveformVisibility) => (checked: boolean) =>
    setVisible((previous) => ({ ...previous, [key]: checked }));

  return (
    <section className="grid gap-4 mt-2">
      <SectionHeading
        // eyebrow="2 — explore it yourself"
        title="Drag it past the textbook case"
        // description="No script here — move the modulation index past 1 and watch over-modulation happen under your own hand, the same transition the spoken commands trigger."
      />

      <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <WaveformView scene={scene} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Modulation index (μ)</Label>
            <span className="text-sm text-muted-foreground tabular-nums">
              {modulationIndex.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.02}
            value={[modulationIndex]}
            onValueChange={(value) => setModulationIndex(Array.isArray(value) ? value[0] : value)}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Message frequency</Label>
            <span className="text-sm text-muted-foreground tabular-nums">
              {messageFrequency.toFixed(1)}×
            </span>
          </div>
          <Slider
            min={1}
            max={5}
            step={0.5}
            value={[messageFrequency]}
            onValueChange={(value) => setMessageFrequency(Array.isArray(value) ? value[0] : value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {(Object.keys(ALL_VISIBLE) as Array<keyof WaveformVisibility>).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm text-foreground capitalize">
            <Switch checked={visible[key]} onCheckedChange={setTrace(key)} />
            {key}
          </label>
        ))}
      </div>
    </section>
  );
}

const COMPARISON_CASES = [
  { label: "Under-modulated", index: 0.4 },
  { label: "Ideal — 100%", index: 1 },
  { label: "Over-modulated", index: 1.6 },
];

function ComparisonSection() {
  return (
    <section className="grid gap-4">
      <SectionHeading
        // eyebrow="3 — at a glance"
        title="Three modulation indices, side by side"
        description="The comparison a textbook figure would draw as three static pictures — the same scope, just fed three fixed scenes instead of one changing one."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {COMPARISON_CASES.map((example) => (
          <div key={example.label} className={cn("grid gap-2 rounded-2xl border border-border/60 bg-card/40 p-4")}>
            <p className="text-center text-sm font-medium text-foreground">{example.label}</p>
            <WaveformView
              showLegend={false}
              scene={waveformScene({
                carrierFrequency: 10,
                messageFrequency: 1,
                modulationIndex: example.index,
                visible: { modulated: true, envelope: true },
                note: "",
              })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
