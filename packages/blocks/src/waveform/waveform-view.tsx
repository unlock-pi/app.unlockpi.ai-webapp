"use client";

/**
 * The dumb renderer — same role as `CircuitView`/`ArrayView`: it draws
 * exactly the `WaveformScene` it's given and owns no domain logic about what
 * amplitude modulation means. It DOES own two things neither of those two
 * renderers need to: easing the visible numbers toward a new scene, and
 * running the oscillation itself. Both are drawing concerns, not domain
 * ones — see the module README's "why this player is different" section for
 * the full reasoning; the short version is that a live analog signal has to
 * actually move every frame, which can't be pre-baked into discrete steps
 * without either choppy playback or an absurd number of frames.
 *
 * Rendering split: the waveform curves and their shading are drawn on a
 * <canvas> (this redraws all five traces at 60fps — a real DOM/SVG element
 * per sample point would mean rebuilding hundreds of nodes a frame for no
 * visual benefit). Everything that's actually text — the legend, the
 * modulation-index badge, tooltips — is ordinary HTML layered on top, so it
 * gets real theming, real accessibility, and crisp text for free instead of
 * hand-drawn canvas glyphs.
 */
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Badge, cn, Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@unlockpi/ui";
import {
  modulationRegime,
  WAVEFORM_HEIGHT,
  WAVEFORM_WIDTH,
  type ModulationRegime,
  type WaveformScene,
  type WaveformVisibility,
} from "./waveform-frame";

const COLORS = {
  background: "#0b0f17",
  grid: "rgba(148, 163, 184, 0.08)",
  carrier: "#38bdf8",
  message: "#c084fc",
  envelope: "#34d399",
  envelopeFill: "rgba(52, 211, 153, 0.16)",
  modulated: "#f59e0b",
  spectrumLine: "rgba(148, 163, 184, 0.3)",
  spectrumLabel: "rgba(226, 232, 240, 0.65)",
} as const;

/** How quickly the scope "catches up" to a new target scene — small enough to read as a deliberate glide, not a lag. */
const EASE_TAU = 0.22;

type LiveState = {
  carrierFrequency: number;
  messageFrequency: number;
  modulationIndex: number;
  reveal: Record<keyof WaveformVisibility, number>;
};

function initialLive(scene: WaveformScene): LiveState {
  return {
    carrierFrequency: scene.carrierFrequency,
    messageFrequency: scene.messageFrequency,
    modulationIndex: scene.modulationIndex,
    reveal: {
      carrier: scene.visible.carrier ? 1 : 0,
      message: scene.visible.message ? 1 : 0,
      modulated: scene.visible.modulated ? 1 : 0,
      envelope: scene.visible.envelope ? 1 : 0,
      spectrum: scene.visible.spectrum ? 1 : 0,
    },
  };
}

/** Exponential approach — `current` moves a fixed FRACTION of the remaining distance each tick, so it's frame-rate independent and never overshoots. */
function approach(current: number, target: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-dt / EASE_TAU));
}

export type WaveformViewProps = {
  scene: WaveformScene;
  className?: string;
  /** Hide the trace legend — for compact side-by-side comparisons where the badge alone says enough. Defaults to shown. */
  showLegend?: boolean;
};

export function WaveformView({ scene, className, showLegend = true }: WaveformViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(scene);
  const liveRef = useRef<LiveState>(initialLive(scene));
  const timeRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    targetRef.current = scene;
  }, [scene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WAVEFORM_WIDTH * dpr;
    canvas.height = WAVEFORM_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    const tick = (now: number) => {
      const last = lastRef.current ?? now;
      const dt = Math.min((now - last) / 1000, 0.05);
      lastRef.current = now;
      timeRef.current += dt;

      const target = targetRef.current;
      const live = liveRef.current;
      live.carrierFrequency = approach(live.carrierFrequency, target.carrierFrequency, dt);
      live.messageFrequency = approach(live.messageFrequency, target.messageFrequency, dt);
      live.modulationIndex = approach(live.modulationIndex, target.modulationIndex, dt);
      (Object.keys(live.reveal) as Array<keyof WaveformVisibility>).forEach((key) => {
        live.reveal[key] = approach(live.reveal[key], target.visible[key] ? 1 : 0, dt);
      });

      draw(ctx, timeRef.current, live);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const regime = modulationRegime(scene.modulationIndex);
  const showBadge = scene.visible.modulated || scene.visible.envelope;

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border/60">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full"
          style={{ aspectRatio: `${WAVEFORM_WIDTH} / ${WAVEFORM_HEIGHT}` }}
        />
        <div className="pointer-events-none absolute top-3 right-3">
          <AnimatePresence mode="wait">
            {showBadge ? (
              <motion.div
                key={regime}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <RegimeBadge regime={regime} index={scene.modulationIndex} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      {showLegend ? <Legend visible={scene.visible} /> : null}
    </div>
  );
}

const REGIME_COPY: Record<
  ModulationRegime,
  { variant: "outline" | "warning" | "success" | "error"; text: (index: number) => string }
> = {
  none: { variant: "outline", text: () => "no modulation yet" },
  under: { variant: "warning", text: (i) => `μ = ${i.toFixed(2)} — under-modulated` },
  ideal: { variant: "success", text: (i) => `μ = ${i.toFixed(2)} — ideal, 100%` },
  over: { variant: "error", text: (i) => `μ = ${i.toFixed(2)} — over-modulated` },
};

function RegimeBadge({ regime, index }: { regime: ModulationRegime; index: number }) {
  const copy = REGIME_COPY[regime];
  return <Badge variant={copy.variant}>{copy.text(index)}</Badge>;
}

type TraceKey = "carrier" | "message" | "modulated" | "envelope";

const TRACE_INFO: Record<TraceKey, { label: string; color: string; description: string }> = {
  carrier: {
    label: "Carrier",
    color: COLORS.carrier,
    description:
      "The high-frequency wave that actually gets transmitted. On its own it carries no information — modulation is what puts the message onto it.",
  },
  message: {
    label: "Message",
    color: COLORS.message,
    description:
      "The original signal — audio, data, whatever needs sending. Too low a frequency to broadcast efficiently on its own.",
  },
  modulated: {
    label: "Modulated (AM)",
    color: COLORS.modulated,
    description: "The carrier with its amplitude varied by the message — this is what's actually sent over the air.",
  },
  envelope: {
    label: "Envelope",
    color: COLORS.envelope,
    description:
      "The shape the modulated wave's peaks trace out — literally 1 + μ·message(t). A receiver can recover the message just by tracing this shape.",
  },
};

function Legend({ visible }: { visible: WaveformVisibility }) {
  return (
    <TooltipProvider delay={150} closeDelay={0}>
      <div className="flex flex-wrap gap-3 px-1">
        {(Object.entries(TRACE_INFO) as Array<[TraceKey, (typeof TRACE_INFO)[TraceKey]]>).map(
          ([key, info]) => (
            <Tooltip key={key}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1.5 text-xs transition-opacity",
                      visible[key] ? "opacity-100" : "opacity-35",
                    )}
                  />
                }
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: info.color }} />
                <span className="text-muted-foreground">{info.label}</span>
              </TooltipTrigger>
              <TooltipPopup className="max-w-56">{info.description}</TooltipPopup>
            </Tooltip>
          ),
        )}
      </div>
    </TooltipProvider>
  );
}

// ── Canvas drawing ──────────────────────────────────────────────────────
// Pure functions over a 2d context — no React, no state, just "given these
// numbers, paint these pixels." Kept separate from the component so the
// per-frame hot path never touches JSX.

function draw(ctx: CanvasRenderingContext2D, time: number, live: LiveState) {
  const spectrumHeight = WAVEFORM_HEIGHT * 0.3 * live.reveal.spectrum;
  const plotHeight = WAVEFORM_HEIGHT - spectrumHeight;
  const centerY = plotHeight / 2;
  // The envelope's peak is (1 + μ) — at μ > 1 that's bigger than the carrier
  // alone, so a fixed scale clips or pushes it off-canvas as μ climbs. Scale
  // to whatever the current peak actually needs (never below 1, so the
  // carrier/message-alone views don't get needlessly small).
  const peak = Math.max(1, 1 + live.modulationIndex);
  const amp = (plotHeight * 0.42) / peak;

  ctx.clearRect(0, 0, WAVEFORM_WIDTH, WAVEFORM_HEIGHT);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WAVEFORM_WIDTH, WAVEFORM_HEIGHT);

  drawGrid(ctx, plotHeight);

  const steps = WAVEFORM_WIDTH;
  const carrierPts: number[] = [];
  const messagePts: number[] = [];
  const envUpperPts: number[] = [];
  const envLowerPts: number[] = [];
  const modulatedPts: number[] = [];

  for (let x = 0; x <= steps; x++) {
    const t = x / steps;
    const carrier = Math.sin(2 * Math.PI * live.carrierFrequency * t + time * 3.4);
    const message = Math.sin(2 * Math.PI * live.messageFrequency * t + time * 1.1);
    const envelope = 1 + live.modulationIndex * message;

    carrierPts.push(centerY - carrier * amp);
    messagePts.push(centerY - message * amp);
    envUpperPts.push(centerY - envelope * amp);
    envLowerPts.push(centerY + envelope * amp);
    modulatedPts.push(centerY - envelope * carrier * amp);
  }

  // The envelope's shaded fill — the one place this component earns the
  // word "shading." Filling between the upper and lower envelope traces
  // shows, at a glance, the shape the message actually carved into the
  // carrier's amplitude, which is the entire idea AM is teaching.
  if (live.reveal.envelope > 0.01) {
    ctx.save();
    ctx.globalAlpha = live.reveal.envelope;
    const gradient = ctx.createLinearGradient(0, 0, 0, plotHeight);
    gradient.addColorStop(0, "rgba(52, 211, 153, 0.03)");
    gradient.addColorStop(0.5, COLORS.envelopeFill);
    gradient.addColorStop(1, "rgba(52, 211, 153, 0.03)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    envUpperPts.forEach((y, x) => (x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    for (let x = steps; x >= 0; x--) ctx.lineTo(x, envLowerPts[x]);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = COLORS.envelope;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    strokePath(ctx, envUpperPts);
    strokePath(ctx, envLowerPts);
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (live.reveal.carrier > 0.01) {
    ctx.save();
    ctx.globalAlpha = live.reveal.carrier;
    ctx.strokeStyle = COLORS.carrier;
    ctx.lineWidth = 1.5;
    strokePath(ctx, carrierPts);
    ctx.restore();
  }

  if (live.reveal.message > 0.01) {
    ctx.save();
    ctx.globalAlpha = live.reveal.message;
    ctx.strokeStyle = COLORS.message;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    strokePath(ctx, messagePts);
    ctx.setLineDash([]);
    ctx.restore();
  }

  if (live.reveal.modulated > 0.01) {
    ctx.save();
    ctx.globalAlpha = live.reveal.modulated;
    ctx.strokeStyle = COLORS.modulated;
    ctx.lineWidth = 2.25;
    strokePath(ctx, modulatedPts);
    ctx.restore();
  }

  if (live.reveal.spectrum > 0.02) {
    drawSpectrum(ctx, plotHeight, spectrumHeight, live);
  }
}

function strokePath(ctx: CanvasRenderingContext2D, points: number[]) {
  ctx.beginPath();
  points.forEach((y, x) => (x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
}

function drawGrid(ctx: CanvasRenderingContext2D, plotHeight: number) {
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, plotHeight / 2);
  ctx.lineTo(WAVEFORM_WIDTH, plotHeight / 2);
  for (let x = 0; x <= WAVEFORM_WIDTH; x += WAVEFORM_WIDTH / 8) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, plotHeight);
  }
  ctx.stroke();
}

/** The frequency-domain strip — three lines (fc−fm, fc, fc+fm) with heights matching AM's actual sideband amplitude ratio (μ·Ac/2 each side of Ac), not just "looks about right." */
function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  plotHeight: number,
  spectrumHeight: number,
  live: LiveState,
) {
  const baseline = plotHeight + spectrumHeight;
  ctx.save();
  ctx.globalAlpha = live.reveal.spectrum;
  ctx.strokeStyle = COLORS.spectrumLine;
  ctx.beginPath();
  ctx.moveTo(0, plotHeight + 0.5);
  ctx.lineTo(WAVEFORM_WIDTH, plotHeight + 0.5);
  ctx.stroke();

  const centerX = WAVEFORM_WIDTH / 2;
  const spread = Math.min(WAVEFORM_WIDTH * 0.3, 40 + live.messageFrequency * 22);
  const maxBar = spectrumHeight - 26;
  const sidebandHeight = Math.max(maxBar * (live.modulationIndex / 2), 2);

  const bars: Array<{ x: number; height: number; color: string; label: string }> = [
    { x: centerX - spread, height: sidebandHeight, color: COLORS.message, label: "fc − fm" },
    { x: centerX, height: maxBar, color: COLORS.carrier, label: "fc" },
    { x: centerX + spread, height: sidebandHeight, color: COLORS.message, label: "fc + fm" },
  ];

  bars.forEach((bar) => {
    ctx.fillStyle = bar.color;
    ctx.fillRect(bar.x - 3, baseline - 12 - bar.height, 6, bar.height);
  });

  ctx.fillStyle = COLORS.spectrumLabel;
  ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  bars.forEach((bar) => ctx.fillText(bar.label, bar.x, baseline - 2));
  ctx.restore();
}
