"use client";

/**
 * The circuit component: pure rendering, no notion of what a "series
 * circuit" or "AND gate truth table" is. It takes a fixed list of
 * components and wires — one CircuitFrame, flattened to props, same
 * convention as ArrayView — and draws them on a FIXED-SIZE board. No pan, no
 * zoom, nothing scrolls: see the module README for why that's deliberate.
 *
 * Where the props come FROM (a live voice agent, a pre-authored lesson, a
 * static demo button) is none of this file's business — see circuit-frame.ts
 * for the shared contract a producer builds these props from, INCLUDING the
 * terminal geometry (`getTerminal`) that keeps a wire's endpoint and a
 * symbol's own drawn lead line landing on the exact same pixel.
 */

import { motion } from "motion/react";

import {
  CIRCUIT_HEIGHT,
  CIRCUIT_WIDTH,
  LEAD,
  type CircuitComponent,
  type CircuitComponentKind,
  type CircuitWire,
} from "@/components/data-structure/circuit/circuit-frame";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CircuitViewProps = {
  components: CircuitComponent[];
  wires: CircuitWire[];
  /** The one part the eye should be on right now — drawn with a focus ring, same idea as ArrayView's `activeIndex`. */
  activeComponentId?: string;
  className?: string;
};

export function CircuitView({
  components,
  wires,
  activeComponentId,
  className,
}: CircuitViewProps) {
  return (
    // Base UI's tooltip delay defaults to ~600ms — tuned for "don't
    // interrupt a busy UI," the opposite of what this board wants, where
    // hovering around IS how someone explores what each part is. This
    // Provider scopes a snappier delay to just this board, without
    // touching the app's global tooltip timing anywhere else.
    <TooltipProvider delay={150} closeDelay={0}>
      <svg
        viewBox={`0 0 ${CIRCUIT_WIDTH} ${CIRCUIT_HEIGHT}`}
        className={cn("w-full max-w-3xl", className)}
        role="img"
        aria-label="Circuit diagram"
      >
        {/* Wires first, so component symbols sit visually on top of their own leads. */}
        {wires.map((wire) => (
          <WireLine key={wire.id} wire={wire} />
        ))}

        {components.map((component) => (
          <ComponentSymbol
            key={component.id}
            component={component}
            isActive={component.id === activeComponentId}
          />
        ))}
      </svg>
    </TooltipProvider>
  );
}

// ── Wires ────────────────────────────────────────────────────────────────

/**
 * Idle wires are a quiet outline, same "grey by default" rule as ArrayView's
 * cells. Energized wires turn the one accent color the app uses for "this is
 * the thing happening right now" (sky, matching ArrayView's `active` cell),
 * plus a marching dash to read as FLOW rather than just a color change —
 * current moving is the entire point of the demonstration.
 *
 * Drawn as a `<path>` with rounded corners (see `roundedPath`), not a bare
 * `<polyline>` — a sharp right-angle bend two wires share reads as "these
 * lines crossed by accident"; a smoothed one reads as "this wire was routed
 * around something on purpose."
 */
function WireLine({ wire }: { wire: CircuitWire }) {
  return (
    <motion.path
      d={roundedPath(wire.points)}
      fill="none"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={wire.energized ? "text-sky-500" : "text-muted-foreground/35"}
      stroke="currentColor"
      strokeDasharray={wire.energized ? "6 6" : undefined}
      animate={wire.energized ? { strokeDashoffset: [0, -24] } : undefined}
      transition={
        wire.energized
          ? { duration: 0.8, repeat: Infinity, ease: "linear" }
          : undefined
      }
    />
  );
}

/**
 * Turns a straight-segment polyline into a smoothly-cornered path: at each
 * interior point, pull back a fixed radius along both adjacent segments and
 * join those two pulled-back points with a quadratic curve centered on the
 * original corner. A 2-point wire (no corner at all) is untouched — this is
 * what gives "sometimes a straight line, sometimes a clean bend" for free,
 * driven entirely by how many points the producer gave the wire.
 */
function roundedPath(points: Array<{ x: number; y: number }>, radius = 14): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    const toPrev = { x: prev.x - corner.x, y: prev.y - corner.y };
    const toNext = { x: next.x - corner.x, y: next.y - corner.y };
    const prevLen = Math.hypot(toPrev.x, toPrev.y);
    const nextLen = Math.hypot(toNext.x, toNext.y);
    // Never pull back further than halfway along the shorter adjacent
    // segment — otherwise two corners close together would overlap.
    const r = Math.min(radius, prevLen / 2, nextLen / 2);

    const start = {
      x: corner.x + (toPrev.x / prevLen) * r,
      y: corner.y + (toPrev.y / prevLen) * r,
    };
    const end = {
      x: corner.x + (toNext.x / nextLen) * r,
      y: corner.y + (toNext.y / nextLen) * r,
    };

    d += ` L ${start.x} ${start.y} Q ${corner.x} ${corner.y} ${end.x} ${end.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

// ── Components ───────────────────────────────────────────────────────────

/** One line of hover copy per kind — legible without it, but there for anyone who wants the vocabulary. */
const COMPONENT_INFO: Record<CircuitComponentKind, { name: string; description: string }> = {
  battery: { name: "Battery", description: "The power source. Pushes current around the loop." },
  resistor: { name: "Resistor", description: "Limits how much current can flow through it." },
  led: { name: "LED", description: "Lights up when current flows through it, one direction only." },
  bulb: { name: "Bulb", description: "Glows when current flows through it." },
  switch: { name: "Switch", description: "Open breaks the loop. Closed completes it." },
  "and-gate": { name: "AND gate", description: "Outputs 1 only when every input is 1." },
  "or-gate": { name: "OR gate", description: "Outputs 1 when at least one input is 1." },
  "not-gate": { name: "NOT gate", description: "Flips its input — 1 becomes 0, 0 becomes 1." },
  node: { name: "Junction", description: "Where a wire splits into two, or two rejoin into one." },
  value: { name: "Signal", description: "A 1 or 0 value travelling along the circuit." },
};

function ComponentSymbol({
  component,
  isActive,
}: {
  component: CircuitComponent;
  isActive: boolean;
}) {
  const { kind, x, y, rotation = 0, label, state, resolved } = component;
  const info = COMPONENT_INFO[kind];

  return (
    // The delay/closeDelay actually live on the <TooltipProvider> wrapping
    // the whole board, in CircuitView above — Base UI puts the timing on
    // the Provider, not on each individual Tooltip.
    <Tooltip>
      <TooltipTrigger render={<g tabIndex={-1} />}>
        <g transform={`translate(${x} ${y}) rotate(${rotation})`}>
          {/*
            An invisible, generous hit area — the symbols themselves are
            thin strokes (a switch's arm, a resistor's zigzag), and SVG only
            registers a hover where a shape is actually painted. Without
            this, "hovering the switch" meant tracing the exact pixel of a
            2px line. `fill="transparent"` (not "none") is what makes an
            invisible shape still receive pointer events.
          */}
          <circle r={36} fill="transparent" stroke="none" />

          {/* Focus ring — the one thing drawing attention, same rule as ArrayView: never more than one part highlighted at once. */}
          {isActive ? (
            <circle
              r={26}
              className="text-sky-400/50"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            />
          ) : null}

          <g
            className={cn(
              "text-foreground",
              (state === "on" || state === "high") &&
                kind !== "value" &&
                "text-amber-500",
            )}
            stroke="currentColor"
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {renderSymbol(kind, state, resolved)}
          </g>

          {label ? (
            <text
              y={30}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px] font-medium"
            >
              {label}
            </text>
          ) : null}
        </g>
      </TooltipTrigger>
      <TooltipPopup className="max-w-52">
        <p className="font-semibold">{info.name}</p>
        <p className="text-muted-foreground">{info.description}</p>
      </TooltipPopup>
    </Tooltip>
  );
}

/**
 * One symbol per kind. Each draws centered on its own origin — the parent
 * `<g>` above already handled position and rotation, so nothing in here
 * knows or cares where on the board it ends up. Every shape's own geometry
 * (lead lengths, gate pill size, input spacing) matches the offsets in
 * `getTerminal()` in circuit-frame.ts exactly — that agreement is what a
 * wire's endpoint and a symbol's edge landing on the same pixel depends on.
 */
function renderSymbol(
  kind: CircuitComponentKind,
  state: CircuitComponent["state"],
  resolved: boolean | undefined,
) {
  switch (kind) {
    case "battery":
      return <BatterySymbol />;
    case "resistor":
      return <ResistorSymbol />;
    case "led":
      return <LedSymbol lit={state === "on" || state === "high"} />;
    case "bulb":
      return <BulbSymbol lit={state === "on" || state === "high"} />;
    case "switch":
      return <SwitchSymbol closed={state === "on"} />;
    case "and-gate":
      return <GateSymbol kind="and-gate" label="AND" />;
    case "or-gate":
      return <GateSymbol kind="or-gate" label="OR" />;
    case "not-gate":
      return <GateSymbol kind="not-gate" label="NOT" />;
    case "node":
      return <circle r={4} fill="currentColor" stroke="none" />;
    case "value":
      return <ValueSymbol state={state} resolved={resolved} />;
  }
}

function BatterySymbol() {
  return (
    <>
      <line x1={-LEAD} y1={0} x2={-6} y2={0} />
      <line x1={-6} y1={-14} x2={-6} y2={14} strokeWidth={3.5} />
      <line x1={6} y1={-8} x2={6} y2={8} strokeWidth={1.5} />
      <line x1={6} y1={0} x2={LEAD} y2={0} />
    </>
  );
}

function ResistorSymbol() {
  // A standard zigzag, five peaks, between two leads.
  return (
    <>
      <line x1={-LEAD} y1={0} x2={-16} y2={0} />
      <path d="M-16,0 L-11,-9 L-3,9 L5,-9 L13,9 L16,0" />
      <line x1={16} y1={0} x2={LEAD} y2={0} />
    </>
  );
}

function LedSymbol({ lit }: { lit: boolean }) {
  return (
    <>
      {lit ? (
        <circle r={16} className="text-amber-400/30" fill="currentColor" stroke="none" />
      ) : null}
      <line x1={-LEAD} y1={0} x2={-8} y2={0} />
      <polygon points="-8,-10 -8,10 8,0" fill="currentColor" fillOpacity={lit ? 1 : 0} />
      <line x1={8} y1={-10} x2={8} y2={10} strokeWidth={3} />
      <line x1={8} y1={0} x2={LEAD} y2={0} />
      {/*
        The two emission rays that mark this as an LED rather than a plain
        diode. These only exist to SIGNAL "light is being emitted" — drawn
        at any opacity when unlit, they read as stray disconnected marks
        instead of rays, so they're fully absent (not just dim) until lit.
      */}
      {lit ? (
        <>
          <line x1={3} y1={-15} x2={9} y2={-21} strokeWidth={1.5} />
          <line x1={10} y1={-12} x2={16} y2={-18} strokeWidth={1.5} />
        </>
      ) : null}
    </>
  );
}

function BulbSymbol({ lit }: { lit: boolean }) {
  return (
    <>
      {lit ? (
        <circle r={17} className="text-amber-400/30" fill="currentColor" stroke="none" />
      ) : null}
      <line x1={-LEAD} y1={0} x2={-11} y2={0} />
      <circle r={11} fill={lit ? "currentColor" : "none"} fillOpacity={lit ? 0.25 : 0} />
      <path d="M-6,-6 L6,6 M-6,6 L6,-6" strokeWidth={1.5} />
      <line x1={11} y1={0} x2={LEAD} y2={0} />
    </>
  );
}

function SwitchSymbol({ closed }: { closed: boolean }) {
  const pivotX = -(LEAD - 6);
  const contactX = LEAD - 6;
  // Open: the arm points up and away from the contact, leaving a visible gap
  // in the circuit — that gap IS the explanation for "why no current flows."
  const armEnd = closed ? { x: contactX, y: 0 } : { x: contactX - 4, y: -12 };

  return (
    <>
      <line x1={-LEAD} y1={0} x2={pivotX} y2={0} />
      <line x1={pivotX} y1={0} x2={armEnd.x} y2={armEnd.y} />
      <circle cx={pivotX} cy={0} r={2.5} fill="currentColor" />
      <circle cx={contactX} cy={0} r={2.5} fill="currentColor" />
      <line x1={contactX} y1={0} x2={LEAD} y2={0} />
    </>
  );
}

/** Gate half-width/height — see the matching offsets in getTerminal()'s TERMINALS table. */
const GATE_HALF_WIDTH = 28;
const GATE_HALF_HEIGHT = 17;
/** How far the OR gate's taper starts back from its tip — the bit of straight edge before the point. */
const GATE_POINT_NECK = GATE_HALF_WIDTH - 14;

/**
 * Gates are solid, labelled shapes rather than the traditional schematic
 * symbols (a D for AND, a curved shield for OR, a triangle+bubble for NOT) —
 * those are accurate but unreadable to someone who's never seen them before,
 * and this module's whole point is "you shouldn't need the caption to
 * understand the picture." AND and NOT stay a rounded pill; OR tapers to a
 * point on its output side — a small shape difference that still reads
 * clearly as "these are different gates" even to someone who can't read yet.
 */
function GateSymbol({
  kind,
  label,
}: {
  kind: "and-gate" | "or-gate" | "not-gate";
  label: string;
}) {
  const pointed = kind === "or-gate";

  return (
    <>
      {/*
        emerald-700, not the brighter emerald-500 this started as: white
        text on emerald-500 measures ~2.6:1 contrast, well under the 4.5:1 a
        13px label needs to read cleanly — it looked "muddy" because it
        genuinely was low-contrast, not a font-weight issue. emerald-700
        against white text is ~5.5:1.
      */}
      {pointed ? (
        <path
          d={`M${GATE_POINT_NECK},${-GATE_HALF_HEIGHT}
              L${GATE_HALF_WIDTH},0
              L${GATE_POINT_NECK},${GATE_HALF_HEIGHT}
              L${-GATE_HALF_WIDTH + GATE_HALF_HEIGHT},${GATE_HALF_HEIGHT}
              A${GATE_HALF_HEIGHT},${GATE_HALF_HEIGHT} 0 0 1 ${-GATE_HALF_WIDTH},0
              A${GATE_HALF_HEIGHT},${GATE_HALF_HEIGHT} 0 0 1 ${-GATE_HALF_WIDTH + GATE_HALF_HEIGHT},${-GATE_HALF_HEIGHT}
              Z`}
          className="fill-emerald-700"
          stroke="none"
        />
      ) : (
        <rect
          x={-GATE_HALF_WIDTH}
          y={-GATE_HALF_HEIGHT}
          width={GATE_HALF_WIDTH * 2}
          height={GATE_HALF_HEIGHT * 2}
          rx={GATE_HALF_HEIGHT}
          className="fill-emerald-700"
          stroke="none"
        />
      )}
      <text
        x={pointed ? -4 : 0}
        y={5}
        textAnchor="middle"
        stroke="none"
        className={cn(
          "text-[13px] tracking-wide fill-white",
          kind === "and-gate" ? "font-semibold" : "font-bold",
        )}
      >
        {label}
      </text>
    </>
  );
}

const VALUE_HALF_WIDTH = 20;
const VALUE_HALF_HEIGHT = 14;

/**
 * A 1/0 badge, or — while `state` is still undefined — a pending "?". The
 * three states share one shape and just change color, which is what makes
 * "this hasn't been computed yet" → "here's the answer" read as the SAME
 * thing resolving, not a different element appearing. Colors are fixed
 * literals, not theme tokens: like ArrayView's active/found cells, the
 * meaning ("this is a 1") has to stay the same regardless of light/dark
 * mode, so it can't be a color the theme is free to redefine.
 */
function ValueSymbol({
  state,
  resolved,
}: {
  state: CircuitComponent["state"];
  resolved?: boolean;
}) {
  const pending = state === undefined;
  const high = state === "high" || state === "on";

  return (
    <>
      {/*
        The 0/pending badges are light — with `stroke="none"` their edge
        could disappear into a light page background with nothing marking
        where the pill actually ends. A thin, fixed-opacity border keeps the
        shape legible regardless of what's behind it.
      */}
      <rect
        x={-VALUE_HALF_WIDTH}
        y={-VALUE_HALF_HEIGHT}
        width={VALUE_HALF_WIDTH * 2}
        height={VALUE_HALF_HEIGHT * 2}
        rx={VALUE_HALF_HEIGHT}
        className={cn(
          pending ? "fill-zinc-600" : high ? "fill-indigo-400" : "fill-stone-200",
          !high && "stroke-black/10",
        )}
        strokeWidth={high ? 0 : 1}
      />
      <text
        y={5}
        textAnchor="middle"
        stroke="none"
        className={cn(
          "text-sm font-bold",
          // The 0 badge's text is pure black, not a near-black grey — a
          // light background is exactly the case where "close to black"
          // isn't the same as looking unambiguously dark.
          pending ? "fill-zinc-300" : high ? "fill-white" : "fill-black",
        )}
      >
        {pending ? "?" : high ? "1" : "0"}
      </text>

      {/* The "this was just computed" badge — never shown on a given input, only on an output once evaluateGate has actually resolved it. */}
      {resolved ? (
        <g transform={`translate(${VALUE_HALF_WIDTH - 4} ${-VALUE_HALF_HEIGHT})`}>
          <circle r={7} className="fill-emerald-700" stroke="none" />
          <path
            d="M-3,0 L-1,2.5 L3.5,-2.5"
            className="stroke-white"
            strokeWidth={1.6}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : null}
    </>
  );
}
