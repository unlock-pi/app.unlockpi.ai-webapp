/**
 * The circuit's animation contract — same idea as `array/array-frame.ts`,
 * same reason it lives here rather than in a feature folder: a live voice
 * agent, a pre-authored lesson, or a static demo page can all produce these
 * without knowing about each other, as long as they agree on this one shape.
 *
 * The one real difference from arrays: an array's layout is implicit (cell
 * order = array order), but a circuit's topology isn't linear — a component
 * needs an explicit position, and a wire needs to know which two points it
 * connects. So a `CircuitFrame` carries positions; whoever BUILDS a frame
 * (see `features/digital-circuits/lib/circuit-ops.ts`) decides where things
 * go. `CircuitView` never computes a layout — it only draws the one it's given.
 *
 * This file also owns the TERMINAL geometry (`getTerminal`) — where exactly
 * on a component's edge a wire should touch. That used to live nowhere: a
 * wire's endpoint and a gate's own drawn input lines were two different,
 * independently-guessed numbers, and a two-input gate's pair of wires both
 * landed on the same point and visually fused. One shared source of truth
 * for "where is this component's Nth terminal" is what keeps that from
 * happening again — see the module README's "wiring" section.
 */

/** The small, fixed symbol set this module knows how to draw. Add a kind here, then teach CircuitView its shape and give it terminals below. */
export type CircuitComponentKind =
  | "battery"
  | "resistor"
  | "led"
  | "bulb"
  | "switch"
  | "and-gate"
  | "or-gate"
  | "not-gate"
  /** A plain wire-junction dot — where a parallel circuit's branches split or rejoin. No value, no label. */
  | "node"
  /** A 1/0 badge — a digital circuit's given input, or a gate's computed output. */
  | "value";

/**
 * One part on the board. `state` means different things per kind — it's
 * deliberately one loose field rather than a kind-specific union, because a
 * frame only ever needs to ask "is this thing in its 'on' state right now,
 * yes or no" to decide how to draw it:
 *   - switch:      "on" (closed, current can pass) | "off" (open, gap in the wire)
 *   - led/bulb:    "high" (lit) | "low" (dark)
 *   - gate/value:  "high" (1) | "low" (0) | undefined (value not known/computed yet — drawn as "?")
 *   - battery/resistor/node: unused, always undefined
 */
export type CircuitComponent = {
  id: string;
  kind: CircuitComponentKind;
  /** Position in the fixed board coordinate space — see CIRCUIT_WIDTH/HEIGHT below. Not a grid cell, not pixels-on-screen; SVG user units that scale with the viewBox. */
  x: number;
  y: number;
  /** Rotates the symbol in 90° steps — a battery standing in a vertical branch, say. */
  rotation?: 0 | 90 | 180 | 270;
  /** Small caption under the symbol, e.g. "R1" or "5V". Not used by `kind: "value"` — its digit IS the label, drawn inside the badge. */
  label?: string;
  state?: "on" | "off" | "high" | "low";
  /**
   * Only meaningful on `kind: "value"`: draws a small green check badge —
   * "this was just computed," not "this was given." An input never gets one;
   * a gate's output does, but only once it's actually been evaluated (see
   * the pending "?" state above).
   */
  resolved?: boolean;
};

/**
 * A wire is a polyline, not "a connection between two component ids" — the
 * producer decides the exact path (so it can route around other parts), and
 * CircuitView just draws whatever points it's given, with corners rounded
 * for the actual drawing (see `roundedPath` in circuit-view.tsx) — the data
 * stays plain straight-line points either way. Keeping wires dumb is what
 * keeps CircuitView dumb: no routing algorithm lives in this folder.
 */
export type CircuitWire = {
  id: string;
  points: Array<{ x: number; y: number }>;
  /** Whether current (analog) or a signal (digital) is flowing through this wire right now. */
  energized?: boolean;
};

/**
 * One beat of an animation: a full snapshot, not a delta — same reasoning as
 * ArrayFrame. `activeComponentId` is the one thing worth looking at right
 * now; never highlight more than one part at a time (see the array README's
 * note on why "everything lights up at once" reads as noise, not teaching).
 */
export type CircuitFrame = {
  components: CircuitComponent[];
  wires: CircuitWire[];
  activeComponentId?: string;
  /** One short line explaining this beat, same as ArrayFrame.note. */
  note: string;
};

/**
 * The fixed board size, in SVG user units. Fixed on purpose — see the module
 * README for why this is not a pannable/zoomable canvas: a teaching circuit
 * has a known, small number of parts, so there's nothing an infinite canvas
 * would buy here except a UI a viewer could get lost in.
 */
export const CIRCUIT_WIDTH = 640;
export const CIRCUIT_HEIGHT = 320;

/** Build one frame. Mirrors `frame()` in array-frame.ts. */
export function circuitFrame(
  components: CircuitComponent[],
  wires: CircuitWire[],
  note: string,
  activeComponentId?: string,
): CircuitFrame {
  return {
    components: components.map((component) => ({ ...component })),
    wires: wires.map((wire) => ({ ...wire, points: [...wire.points] })),
    activeComponentId,
    note,
  };
}

// ── Terminals ────────────────────────────────────────────────────────────
// Where a wire is allowed to touch a component, in the symbol's own local
// coordinates (before the `<g transform="translate(x,y) rotate(...)">` that
// positions it on the board — see ComponentSymbol in circuit-view.tsx). A
// 2-input gate has two DISTINCT input terminals; using one generic "left"
// point for both — which is what this file did before — is exactly what
// made two input wires converge on the same pixel and look fused.

export type TerminalName = "left" | "right" | "in1" | "in2" | "out";

/** How far a two-terminal part's leads (battery, resistor, LED, bulb, switch) extend from its center. */
export const LEAD = 24;
/** Same idea for a value badge — shorter, since the badge itself is the visible shape, not a symbol with leads either side of it. */
const VALUE_LEAD = 22;
/** How far apart a gate's two input terminals sit, above and below center. */
const GATE_INPUT_SPREAD = 8;

type Point = { x: number; y: number };

const TWO_TERMINAL: Record<"left" | "right", Point> = {
  left: { x: -LEAD, y: 0 },
  right: { x: LEAD, y: 0 },
};

const TERMINALS: Record<CircuitComponentKind, Partial<Record<TerminalName, Point>>> = {
  battery: TWO_TERMINAL,
  resistor: TWO_TERMINAL,
  led: TWO_TERMINAL,
  bulb: TWO_TERMINAL,
  switch: TWO_TERMINAL,
  node: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
  value: { left: { x: -VALUE_LEAD, y: 0 }, right: { x: VALUE_LEAD, y: 0 } },
  "and-gate": {
    in1: { x: -LEAD, y: -GATE_INPUT_SPREAD },
    in2: { x: -LEAD, y: GATE_INPUT_SPREAD },
    out: { x: LEAD, y: 0 },
  },
  "or-gate": {
    in1: { x: -LEAD, y: -GATE_INPUT_SPREAD },
    in2: { x: -LEAD, y: GATE_INPUT_SPREAD },
    out: { x: LEAD, y: 0 },
  },
  "not-gate": {
    in1: { x: -LEAD, y: 0 },
    out: { x: LEAD, y: 0 },
  },
};

/**
 * The absolute board position of one of a component's terminals — its local
 * offset (above), rotated and translated to where the component actually
 * sits. This is what both `circuit-ops.ts` (to end a wire exactly here) and
 * `CircuitView` (to start the symbol's own drawn lead line exactly here)
 * call, so the two can never drift apart.
 */
export function getTerminal(component: CircuitComponent, terminal: TerminalName): Point {
  const local = TERMINALS[component.kind][terminal];
  if (!local) {
    throw new Error(`${component.kind} has no "${terminal}" terminal.`);
  }
  const rotated = rotatePoint(local, component.rotation ?? 0);
  return { x: component.x + rotated.x, y: component.y + rotated.y };
}

function rotatePoint(point: Point, rotation: 0 | 90 | 180 | 270): Point {
  switch (rotation) {
    case 0:
      return point;
    case 90:
      return { x: -point.y, y: point.x };
    case 180:
      return { x: -point.x, y: -point.y };
    case 270:
      return { x: point.y, y: -point.x };
  }
}
