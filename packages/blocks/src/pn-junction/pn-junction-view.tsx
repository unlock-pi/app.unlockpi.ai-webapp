"use client";

/**
 * The dumb-ish renderer — same role and same deliberate exception as
 * `WaveformView` (see that module's README for the full reasoning): it owns
 * the eased glide toward a new `PNJunctionScene` and a small idle-motion
 * clock so the charge carriers read as actually drifting, not frozen. Every
 * OTHER decision — what a depletion region's width means, what voltage
 * counts as "forward-biased" — lives in `pn-junction-frame.ts` and
 * `pn-ops.ts`, one level up.
 *
 * Same canvas/HTML split as `WaveformView` too: the blocks, carriers, ions,
 * depletion band, and battery/wires are canvas (dozens of small shapes
 * redrawn every frame — a real DOM node per carrier would be needless
 * overhead for something this decorative). The legend, the bias badge, and
 * the note are ordinary HTML layered on top.
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { Badge, cn, Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@unlockpi/ui";
import {
  BARRIER_VOLTAGE,
  biasRegime,
  PN_HEIGHT,
  PN_WIDTH,
  type BiasRegime,
  type PNJunctionScene,
} from "./pn-junction-frame";

const COLORS = {
  // Same dark "scope" background as WaveformView (#0b0f17) — a deliberate,
  // literal reuse: this app's canvas-drawn components all live on the same
  // dark surface, the same way every trace/badge/legend convention carries
  // over from one module to the next.
  background: "#184D8A",
  pMicroscopic: [43, 47, 54] as const,
  pSchematic: [153, 27, 27] as const,
  nMicroscopic: [199, 205, 214] as const,
  nSchematic: [30, 64, 175] as const,
  carrier: "#f97316",
  ionNegativeFill: "#BE1D2C",
  ionPositiveFill: "#f1f5f9",
  ionPositiveText: "#111827",
  depletionFill: "rgba(245, 158, 11, 0.22)",
  depletionEdge: "rgba(245, 158, 11, 0.55)",
  labelBright: "#e2e8f0",
  labelMuted: "rgba(226, 232, 240, 0.6)",
  wire: "rgba(226, 232, 240, 0.7)",
  current: "#38bdf8",
} as const;

const EASE_TAU = 0.24;

type LiveState = {
  proximity: number;
  depletionWidth: number;
  appliedVoltage: number;
  schematic: number;
  chargeLabels: number;
  currentFlow: number;
};

function initialLive(scene: PNJunctionScene): LiveState {
  return {
    proximity: scene.proximity,
    depletionWidth: scene.depletionWidth,
    appliedVoltage: scene.appliedVoltage,
    schematic: scene.schematic,
    chargeLabels: scene.showChargeLabels ? 1 : 0,
    currentFlow: scene.showCurrentFlow ? 1 : 0,
  };
}

function approach(current: number, target: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-dt / EASE_TAU));
}

type Carrier = { side: "p" | "n"; nx: number; ny: number; phase: number };

function makeCarriers(): Carrier[] {
  const carriers: Carrier[] = [];
  for (let i = 0; i < 18; i++) {
    carriers.push({ side: "p", nx: 0.08 + Math.random() * 0.84, ny: 0.08 + Math.random() * 0.84, phase: Math.random() * Math.PI * 2 });
  }
  for (let i = 0; i < 18; i++) {
    carriers.push({ side: "n", nx: 0.08 + Math.random() * 0.84, ny: 0.08 + Math.random() * 0.84, phase: Math.random() * Math.PI * 2 });
  }
  return carriers;
}

/**
 * A single carrier caught in the act of recombining: it travels from
 * somewhere out in the bulk toward one of the six ion slots at the junction,
 * "arrives" (a brief flash, right where its ion sits), then respawns
 * somewhere new and does it again. Two independent pools — one drifting in
 * from the P side, one from the N side — read as an ongoing EXCHANGE because
 * they converge on the same central slots from opposite directions, not
 * because anything explicitly draws a "trade."
 */
type Migrant = { side: "p" | "n"; slot: number; t: number; speed: number; startNx: number };

/** How many of the six ion slots are actually "live" right now — migrants only travel to a slot that has (or is about to have) a real ion, so the motion stays tied to the actual depletion state instead of running independent of it. */
function activeSlotCount(depletionWidth: number): number {
  return Math.max(1, Math.min(6, Math.ceil(depletionWidth / 0.15)));
}

function resetMigrant(m: Migrant, slotCount: number): void {
  m.slot = Math.floor(Math.random() * slotCount);
  m.t = 0;
  m.speed = 0.22 + Math.random() * 0.18;
  // "Far from the junction" means different nx depending on side — P's
  // junction-facing edge is its right edge, N's is its left, matching the
  // same side-dependent distance convention the carrier pool already uses.
  m.startNx = m.side === "p" ? 0.1 + Math.random() * 0.35 : 0.55 + Math.random() * 0.35;
}

function makeMigrants(): Migrant[] {
  const migrants: Migrant[] = [];
  for (let i = 0; i < 6; i++) {
    const m: Migrant = { side: i % 2 === 0 ? "p" : "n", slot: 0, t: Math.random(), speed: 0.25, startNx: 0 };
    resetMigrant(m, 1);
    migrants.push(m);
  }
  return migrants;
}

function advanceMigrants(migrants: Migrant[], dt: number, depletionWidth: number): void {
  if (depletionWidth < 0.06) return; // nothing forming yet — leave them parked
  const slotCount = activeSlotCount(depletionWidth);
  for (const m of migrants) {
    m.t += dt * m.speed;
    if (m.t >= 1) resetMigrant(m, slotCount);
  }
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

export type PNJunctionViewProps = {
  scene: PNJunctionScene;
  className?: string;
  showLegend?: boolean;
};

export function PNJunctionView({ scene, className, showLegend = true }: PNJunctionViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(scene);
  const liveRef = useRef<LiveState>(initialLive(scene));
  const [carriers] = useState<Carrier[]>(() => makeCarriers());
  const [migrants] = useState<Migrant[]>(() => makeMigrants());
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
    canvas.width = PN_WIDTH * dpr;
    canvas.height = PN_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    const tick = (now: number) => {
      const last = lastRef.current ?? now;
      const dt = Math.min((now - last) / 1000, 0.05);
      lastRef.current = now;
      timeRef.current += dt;

      const target = targetRef.current;
      const live = liveRef.current;
      live.proximity = approach(live.proximity, target.proximity, dt);
      live.depletionWidth = approach(live.depletionWidth, target.depletionWidth, dt);
      live.appliedVoltage = approach(live.appliedVoltage, target.appliedVoltage, dt);
      live.schematic = approach(live.schematic, target.schematic, dt);
      live.chargeLabels = approach(live.chargeLabels, target.showChargeLabels ? 1 : 0, dt);
      live.currentFlow = approach(live.currentFlow, target.showCurrentFlow ? 1 : 0, dt);
      advanceMigrants(migrants, dt, live.depletionWidth);

      draw(ctx, timeRef.current, live, carriers, migrants);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [carriers, migrants]);

  const regime = biasRegime(scene.appliedVoltage);

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border/60">
        <canvas ref={canvasRef} className="block h-auto w-full" style={{ aspectRatio: `${PN_WIDTH} / ${PN_HEIGHT}` }} />
        <div className="pointer-events-none absolute top-3 right-3">
          <AnimatePresence mode="wait">
            {scene.schematic > 0.3 ? (
              <motion.div
                key={regime}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <RegimeBadge regime={regime} voltage={scene.appliedVoltage} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      {showLegend ? <Legend scene={scene} /> : null}
    </div>
  );
}

const REGIME_COPY: Record<BiasRegime, { variant: "outline" | "info" | "warning" | "success"; text: (v: number) => string }> = {
  unbiased: { variant: "outline", text: () => "unbiased" },
  reverse: { variant: "info", text: (v) => `${v.toFixed(1)}V reverse — no current` },
  "partial-forward": { variant: "warning", text: (v) => `${v.toFixed(1)}V forward — below the ${BARRIER_VOLTAGE}V barrier` },
  forward: { variant: "success", text: (v) => `${v.toFixed(1)}V forward — conducting` },
};

function RegimeBadge({ regime, voltage }: { regime: BiasRegime; voltage: number }) {
  const copy = REGIME_COPY[regime];
  return <Badge variant={copy.variant}>{copy.text(voltage)}</Badge>;
}

type LegendKey = "hole" | "electron" | "ion" | "depletion" | "current";

const LEGEND_INFO: Record<LegendKey, { label: string; swatch: string; description: string }> = {
  hole: {
    label: "Hole",
    swatch: COLORS.carrier,
    description: "A missing electron in the P-type material — behaves like a free positive charge carrier.",
  },
  electron: {
    label: "Electron",
    swatch: COLORS.carrier,
    description: "A free electron in the N-type material — the negative charge carrier.",
  },
  ion: {
    label: "Ion (fixed)",
    swatch: "#9ca3af",
    description: "What's left behind after a hole and an electron recombine near the junction — fixed in place, unlike the carriers that were free to roam.",
  },
  depletion: {
    label: "Depletion region",
    swatch: "#f59e0b",
    description: "The zone emptied of free carriers by recombination. Its width — and whether it collapses — is what controls whether current flows.",
  },
  current: {
    label: "Current",
    swatch: COLORS.current,
    description: "Only flows once forward bias exceeds the barrier voltage and the depletion region fully collapses.",
  },
};

function Legend({ scene }: { scene: PNJunctionScene }) {
  const relevance: Record<LegendKey, boolean> = {
    hole: scene.schematic < 0.6,
    electron: scene.schematic < 0.6,
    ion: scene.schematic < 0.6 && scene.depletionWidth > 0.03,
    depletion: scene.depletionWidth > 0.03,
    current: scene.showCurrentFlow,
  };

  return (
    <TooltipProvider delay={150} closeDelay={0}>
      <div className="flex flex-wrap gap-3 px-1">
        {(Object.entries(LEGEND_INFO) as Array<[LegendKey, (typeof LEGEND_INFO)[LegendKey]]>).map(([key, info]) => (
          <Tooltip key={key}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className={cn("flex items-center gap-1.5 text-xs transition-opacity", relevance[key] ? "opacity-100" : "opacity-35")}
                />
              }
            >
              <span
                className={cn("size-2", key === "hole" ? "rounded-full border-2 bg-pink-400" : "rounded-full")}
                style={key === "hole" ? { borderColor: info.swatch } : { backgroundColor: info.swatch }}
              />
              <span className="text-muted-foreground">{info.label}</span>
            </TooltipTrigger>
            <TooltipPopup className="max-w-56">{info.description}</TooltipPopup>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// ── Canvas drawing ──────────────────────────────────────────────────────

const MARGIN = 24;
const MAX_GAP = 64;
const BLOCK_TOP = 92;
const BLOCK_HEIGHT = 164;
const LABEL_Y = 68;
const BATTERY_Y = 26;
const DEPLETION_LABEL_Y = BLOCK_TOP + BLOCK_HEIGHT + 32;

function lerpColor(a: readonly [number, number, number], b: readonly [number, number, number], t: number): string {
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(a[0] + (b[0] - a[0]) * c);
  const g = Math.round(a[1] + (b[1] - a[1]) * c);
  const bl = Math.round(a[2] + (b[2] - a[2]) * c);
  return `rgb(${r}, ${g}, ${bl})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(
  ctx: CanvasRenderingContext2D,
  time: number,
  live: LiveState,
  carriers: Carrier[],
  migrants: Migrant[],
) {
  ctx.clearRect(0, 0, PN_WIDTH, PN_HEIGHT);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, PN_WIDTH, PN_HEIGHT);

  const gap = (1 - live.proximity) * MAX_GAP;
  const blockWidth = (PN_WIDTH - MARGIN * 2 - gap) / 2;
  const pLeft = MARGIN;
  const pRight = pLeft + blockWidth;
  const nLeft = pRight + gap;
  const nRight = nLeft + blockWidth;
  const junctionX = (pRight + nLeft) / 2;

  // Blocks — dark/light gray in microscopic view, red/blue schematic once zoomed out.
  const pColor = lerpColor(COLORS.pMicroscopic, COLORS.pSchematic, live.schematic);
  const nColor = lerpColor(COLORS.nMicroscopic, COLORS.nSchematic, live.schematic);
  roundRect(ctx, pLeft, BLOCK_TOP, blockWidth, BLOCK_HEIGHT, 12);
  ctx.fillStyle = pColor;
  ctx.fill();
  roundRect(ctx, nLeft, BLOCK_TOP, blockWidth, BLOCK_HEIGHT, 12);
  ctx.fillStyle = nColor;
  ctx.fill();

  // Depletion band — the one element that stays legible at every zoom level.
  if (live.depletionWidth > 0.02) {
    const halfBand = Math.min(live.depletionWidth * 42, blockWidth * 0.85);
    ctx.fillStyle = COLORS.depletionFill;
    ctx.fillRect(junctionX - halfBand, BLOCK_TOP, halfBand * 2, BLOCK_HEIGHT);
    ctx.strokeStyle = COLORS.depletionEdge;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(junctionX - halfBand, BLOCK_TOP, halfBand * 2, BLOCK_HEIGHT);
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.labelMuted;
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Depletion region", junctionX, DEPLETION_LABEL_Y);
  }

  // Carriers — fade out as the view zooms into schematic mode. A P-side
  // carrier recombines (fades to near-nothing) once the depletion region's
  // reach from the junction passes it; same for an N-side one.
  const carrierAlpha = 1 - live.schematic;
  if (carrierAlpha > 0.02) {
    const depletionReach = Math.min(live.depletionWidth * 0.5, 0.85);
    ctx.lineWidth = 1.5;
    for (const c of carriers) {
      const block = c.side === "p" ? { left: pLeft, width: blockWidth } : { left: nLeft, width: blockWidth };
      const baseX = block.left + c.nx * block.width;
      const baseY = BLOCK_TOP + c.ny * BLOCK_HEIGHT;
      const x = baseX + Math.sin(time * 0.6 + c.phase) * 3;
      const y = baseY + Math.cos(time * 0.5 + c.phase * 1.3) * 3;

      const distFromJunction = c.side === "p" ? 1 - c.nx : c.nx;
      const recombined = distFromJunction < depletionReach;
      ctx.globalAlpha = carrierAlpha * (recombined ? 0.06 : 1);
      ctx.strokeStyle = COLORS.carrier;
      ctx.fillStyle = COLORS.carrier;
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      if (c.side === "p") ctx.stroke();
      else ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Migrating carriers — the actual "recombination in progress" animation:
  // a small pool of particles perpetually travels from the bulk toward a
  // slot at the junction and flashes on arrival, right where that slot's
  // ion sits. P-side particles travel rightward, N-side leftward — both
  // converging on the same central slots from opposite directions is what
  // reads as an exchange, not any explicit "swap" being drawn.
  const migrantAlpha = 1 - live.schematic;
  if (migrantAlpha > 0.02 && live.depletionWidth > 0.06) {
    for (const m of migrants) {
      const y = BLOCK_TOP + ((m.slot + 0.5) / 6) * BLOCK_HEIGHT;
      const inset = 10 + m.slot * 2;
      const endX = m.side === "p" ? junctionX - inset : junctionX + inset;
      const startX = m.side === "p" ? pLeft + m.startNx * blockWidth : nLeft + m.startNx * blockWidth;
      const arrivalFade = 1 - Math.max(0, Math.min(1, (m.t - 0.88) / 0.12));

      // A short fading trail behind the particle — without it, this reads
      // as more random jitter rather than a particle actually going
      // somewhere.
      for (let k = 3; k >= 1; k--) {
        const tk = Math.max(0, m.t - k * 0.035);
        const xk = startX + (endX - startX) * easeInOut(tk);
        ctx.globalAlpha = migrantAlpha * arrivalFade * (0.35 - k * 0.08);
        ctx.beginPath();
        ctx.arc(xk, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.carrier;
        ctx.fill();
      }

      const x = startX + (endX - startX) * easeInOut(Math.min(m.t, 1));
      ctx.globalAlpha = migrantAlpha * arrivalFade;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      if (m.side === "p") {
        ctx.strokeStyle = COLORS.carrier;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = COLORS.carrier;
        ctx.fill();
      }

      // The recombination flash — a brief expanding, fading ring right at
      // the destination slot, timed to land exactly as the particle arrives.
      if (m.t > 0.85) {
        const flashT = (m.t - 0.85) / 0.15;
        ctx.globalAlpha = migrantAlpha * (1 - flashT) * 0.8;
        ctx.beginPath();
        ctx.arc(endX, y, 4 + flashT * 10, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Ions — six slots per side, popping in one at a time as the depletion
  // region actually reaches that slot, fading out again in schematic mode.
  const ionAlpha = 1 - live.schematic;
  if (ionAlpha > 0.02) {
    const slots = 6;
    for (let i = 0; i < slots; i++) {
      const reveal = Math.max(0, Math.min(1, (live.depletionWidth - i * 0.15) * 6));
      if (reveal <= 0.01) continue;
      const y = BLOCK_TOP + ((i + 0.5) / slots) * BLOCK_HEIGHT;
      const inset = 10 + i * 2;

      ctx.globalAlpha = ionAlpha * reveal;
      ctx.beginPath();
      ctx.arc(junctionX - inset, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ionNegativeFill;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(junctionX - inset - 4, y - 1, 8, 2);

      ctx.beginPath();
      ctx.arc(junctionX + inset, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.ionPositiveFill;
      ctx.fill();
      ctx.fillStyle = COLORS.ionPositiveText;
      ctx.fillRect(junctionX + inset - 4, y - 1, 8, 2);
      ctx.fillRect(junctionX + inset - 1, y - 4, 2, 8);
    }
    ctx.globalAlpha = 1;
  }

  // P / N letters, always present, plus the charge captions once revealed.
  ctx.fillStyle = COLORS.labelBright;
  ctx.font = "bold 26px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("P", pLeft + blockWidth / 2, LABEL_Y);
  ctx.fillText("N", nLeft + blockWidth / 2, LABEL_Y);

  if (live.chargeLabels > 0.02) {
    ctx.globalAlpha = live.chargeLabels;
    ctx.font = "italic 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = COLORS.labelMuted;
    ctx.fillText("negatively charged", pLeft + blockWidth / 2, LABEL_Y + 16);
    ctx.fillText("positively charged", nLeft + blockWidth / 2, LABEL_Y + 16);
    ctx.globalAlpha = 1;
  }

  // Battery + wires — fades in as the view zooms to schematic. Sharp right
  // angles are deliberate here (unlike the rounded hand-drawn wires in
  // circuit-view): a battery symbol is a proper schematic, where square
  // corners are the actual convention, not a stylistic default.
  if (live.schematic > 0.02) {
    ctx.globalAlpha = live.schematic;
    const pMidY = BLOCK_TOP + BLOCK_HEIGHT / 2;
    const nMidY = pMidY;
    const forward = live.appliedVoltage > 0.05;

    ctx.strokeStyle = COLORS.wire;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pLeft, pMidY);
    ctx.lineTo(pLeft - 14, pMidY);
    ctx.lineTo(pLeft - 14, BATTERY_Y);
    ctx.lineTo(PN_WIDTH / 2 - 16, BATTERY_Y);
    ctx.moveTo(nRight, nMidY);
    ctx.lineTo(nRight + 14, nMidY);
    ctx.lineTo(nRight + 14, BATTERY_Y);
    ctx.lineTo(PN_WIDTH / 2 + 16, BATTERY_Y);
    ctx.stroke();

    // Battery plates: one short/thick, one tall/thin — the plate nearer P
    // carries whichever polarity actually drives the current story.
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(PN_WIDTH / 2 - 16, BATTERY_Y - 10);
    ctx.lineTo(PN_WIDTH / 2 - 16, BATTERY_Y + 10);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PN_WIDTH / 2 + 16, BATTERY_Y - 6);
    ctx.lineTo(PN_WIDTH / 2 + 16, BATTERY_Y + 6);
    ctx.stroke();

    ctx.font = "bold 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = COLORS.labelBright;
    ctx.fillText(forward ? "+" : "−", PN_WIDTH / 2 - 16, BATTERY_Y - 16);
    ctx.fillText(forward ? "−" : "+", PN_WIDTH / 2 + 16, BATTERY_Y - 16);

    if (live.currentFlow > 0.02) {
      ctx.globalAlpha = live.schematic * live.currentFlow;
      ctx.strokeStyle = COLORS.current;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -time * 30;
      ctx.beginPath();
      ctx.moveTo(pLeft, pMidY);
      ctx.lineTo(pLeft - 14, pMidY);
      ctx.lineTo(pLeft - 14, BATTERY_Y);
      ctx.lineTo(PN_WIDTH / 2 - 16, BATTERY_Y);
      ctx.moveTo(nRight, nMidY);
      ctx.lineTo(nRight + 14, nMidY);
      ctx.lineTo(nRight + 14, BATTERY_Y);
      ctx.lineTo(PN_WIDTH / 2 + 16, BATTERY_Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }
}
