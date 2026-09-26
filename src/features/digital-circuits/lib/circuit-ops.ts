/**
 * The circuit's operations: build a series circuit, flip a switch, build a
 * parallel circuit, evaluate a logic gate. Every export is a PURE function —
 * `(...) => CircuitOpResult` — that never mutates its input and never
 * touches React, the DOM, or the network. Exactly the same shape as
 * arrays-agent's `array-ops.ts`, on purpose: `CircuitOpResult.frames` is the
 * whole animation as a list of snapshots, and nothing downstream (the
 * player, CircuitView, a future voice agent) needs to know HOW an operation
 * built them.
 *
 * This is a v1 slice, not a full component library — five operations, not
 * fifty. Adding a sixth means: build the components/wires for the starting
 * picture, then push one CircuitFrame per beat you want the viewer to see.
 * That's the whole recipe; nothing else in this file is required reading to
 * add one more.
 */
import {
  circuitFrame,
  getTerminal,
  type CircuitComponent,
  type CircuitFrame,
  type CircuitWire,
  type TerminalName,
} from "@/components/data-structure/circuit";

/** What every circuit operation hands back — same role as arrays-agent's ArrayOpResult. */
export type CircuitOpResult = {
  components: CircuitComponent[];
  wires: CircuitWire[];
  frames: CircuitFrame[];
  /** Plain-language result, for a caption or (later) for a model to speak. */
  summary: string;
};

// ── Layout constants ─────────────────────────────────────────────────────
// Every operation below places components at fixed, hand-picked coordinates
// inside the CIRCUIT_WIDTH x CIRCUIT_HEIGHT board — there is no layout
// solver anywhere in this file. See the module README for why: a teaching
// circuit has a small, known set of shapes (series, parallel, one gate), so
// hardcoding where things go is simpler and more predictable than a general
// graph-layout algorithm, and it keeps CircuitView itself free of any
// layout logic at all.

/**
 * A wire between two NAMED terminals — never a generic "left/right" guess.
 * `getTerminal` (circuit-frame.ts) is the single source of truth for where a
 * terminal actually sits, shared with CircuitView's own drawing, so a wire's
 * endpoint and the symbol's drawn edge always land on the same pixel. This
 * is what used to go wrong: a 2-input gate's pair of wires both aimed at one
 * generic "left" point and visually fused together.
 */
function wireBetween(
  id: string,
  from: CircuitComponent,
  fromTerminal: TerminalName,
  to: CircuitComponent,
  toTerminal: TerminalName,
  via: Array<{ x: number; y: number }> = [],
): CircuitWire {
  return {
    id,
    points: [getTerminal(from, fromTerminal), ...via, getTerminal(to, toTerminal)],
  };
}

// ── Series circuit ───────────────────────────────────────────────────────

/**
 * Battery, switch, resistor, LED in one loop — the first circuit anyone
 * learns, and the clearest way to show "a break anywhere stops everything."
 */
export function createSeriesCircuit(): CircuitOpResult {
  const battery: CircuitComponent = { id: "battery", kind: "battery", x: 140, y: 60, label: "9V" };
  const toggle: CircuitComponent = { id: "switch", kind: "switch", x: 260, y: 60, state: "off" };
  const resistor: CircuitComponent = { id: "resistor", kind: "resistor", x: 380, y: 60, label: "220Ω" };
  const led: CircuitComponent = { id: "led", kind: "led", x: 500, y: 60, state: "low" };
  const components = [battery, toggle, resistor, led];

  const wires: CircuitWire[] = [
    wireBetween("w1", battery, "right", toggle, "left"),
    wireBetween("w2", toggle, "right", resistor, "left"),
    wireBetween("w3", resistor, "right", led, "left"),
    // The return path: right off the LED, down and along the bottom edge,
    // back up into the battery's other lead — this is what makes it a LOOP
    // rather than a row of parts with two dead ends.
    wireBetween("w4", led, "right", battery, "left", [
      { x: 560, y: 60 },
      { x: 560, y: 260 },
      { x: 80, y: 260 },
      { x: 80, y: 60 },
    ]),
  ];

  return {
    components,
    wires,
    frames: [
      circuitFrame(components, wires, "A battery, a switch, a resistor and an LED — one loop."),
      circuitFrame(
        components,
        wires,
        "The switch is open. There's a gap in the loop, so nothing can flow yet.",
        toggle.id,
      ),
    ],
    summary: "Built a series circuit: battery → switch → resistor → LED. The switch is open.",
  };
}

/**
 * Flip a switch and watch the consequence travel around the loop one wire
 * at a time — the same "one focus point per beat" rule as an array insert:
 * closing the switch, then each wire lighting up in the order current would
 * actually reach it, then the LED. Reads as cause and effect, not a flash.
 */
export function toggleSwitch(
  components: CircuitComponent[],
  wires: CircuitWire[],
  switchId: string,
): CircuitOpResult {
  const target = components.find((component) => component.id === switchId);
  if (!target || target.kind !== "switch") {
    return { components, wires, frames: [circuitFrame(components, wires, "No switch to toggle.")], summary: "There's no switch on this board." };
  }

  const closing = target.state !== "on";
  const nextState: CircuitComponent["state"] = closing ? "on" : "off";

  const led = components.find((component) => component.kind === "led" || component.kind === "bulb");

  const withSwitch = components.map((component) =>
    component.id === switchId ? { ...component, state: nextState } : component,
  );

  const frames: CircuitFrame[] = [
    circuitFrame(
      withSwitch,
      wires,
      closing ? "Closing the switch — the gap is gone." : "Opening the switch — the loop breaks here.",
      switchId,
    ),
  ];

  // The wires in loop order, starting just after the switch — that's the
  // order current reaches them once the loop closes.
  const orderedWireIds = orderWiresFrom(wires, switchId, components);
  let runningWires = wires;
  let runningComponents = withSwitch;

  if (closing) {
    for (const wireId of orderedWireIds) {
      runningWires = runningWires.map((wire) =>
        wire.id === wireId ? { ...wire, energized: true } : wire,
      );
      frames.push(circuitFrame(runningComponents, runningWires, "Current reaches the next wire."));
    }
    if (led) {
      runningComponents = runningComponents.map((component) =>
        component.id === led.id ? { ...component, state: "high" } : component,
      );
      frames.push(circuitFrame(runningComponents, runningWires, "The LED lights up.", led.id));
    }
  } else {
    runningWires = wires.map((wire) => ({ ...wire, energized: false }));
    if (led) {
      runningComponents = runningComponents.map((component) =>
        component.id === led.id ? { ...component, state: "low" } : component,
      );
    }
    frames.push(circuitFrame(runningComponents, runningWires, "No path back to the battery — everything goes dark at once."));
  }

  return {
    components: runningComponents,
    wires: runningWires,
    frames,
    summary: closing
      ? "Closed the switch. Current flows around the loop and the LED lights up."
      : "Opened the switch. The loop is broken and the LED goes dark.",
  };
}

/**
 * Wire ids in loop order, rotated so the wire LEAVING `fromId` comes first —
 * that's the first thing current reaches once the switch closes. Found by
 * matching endpoint coordinates rather than tracking from/to ids on `Wire`
 * (which only stores points): every board this file builds is one simple
 * loop, so "the wire whose first point sits on the switch's right terminal"
 * is enough to find the starting point without a real graph traversal.
 */
function orderWiresFrom(
  wires: CircuitWire[],
  fromId: string,
  components: CircuitComponent[],
): string[] {
  const switchComponent = components.find((component) => component.id === fromId);
  if (!switchComponent) return wires.map((wire) => wire.id);

  const exitPoint = getTerminal(switchComponent, "right");
  const startIndex = wires.findIndex((wire) => {
    const first = wire.points[0];
    return first.x === exitPoint.x && first.y === exitPoint.y;
  });
  if (startIndex === -1) return wires.map((wire) => wire.id);

  const ids = wires.map((wire) => wire.id);
  return [...ids.slice(startIndex), ...ids.slice(0, startIndex)];
}

// ── Parallel circuit ─────────────────────────────────────────────────────

/**
 * One switch feeding two branches side by side, each with its own resistor
 * and LED — the shape that explains "each branch gets the full voltage,
 * independently" once both LEDs light from a single switch close.
 */
export function createParallelCircuit(): CircuitOpResult {
  const battery: CircuitComponent = { id: "battery", kind: "battery", x: 100, y: 160, label: "9V" };
  const toggle: CircuitComponent = { id: "switch", kind: "switch", x: 200, y: 160, state: "off" };
  const nodeIn: CircuitComponent = { id: "node-in", kind: "node", x: 280, y: 160 };
  const nodeOut: CircuitComponent = { id: "node-out", kind: "node", x: 560, y: 160 };

  const resistorA: CircuitComponent = { id: "resistor-a", kind: "resistor", x: 380, y: 90, label: "220Ω" };
  const ledA: CircuitComponent = { id: "led-a", kind: "led", x: 480, y: 90, state: "low" };
  const resistorB: CircuitComponent = { id: "resistor-b", kind: "resistor", x: 380, y: 230, label: "220Ω" };
  const ledB: CircuitComponent = { id: "led-b", kind: "led", x: 480, y: 230, state: "low" };

  const components = [battery, toggle, nodeIn, nodeOut, resistorA, ledA, resistorB, ledB];

  const wires: CircuitWire[] = [
    wireBetween("w-supply", battery, "right", toggle, "left"),
    wireBetween("w-switch-node", toggle, "right", nodeIn, "left"),
    // The split: one wire climbs to the top branch, one drops to the bottom.
    wireBetween("w-branch-a-in", nodeIn, "right", resistorA, "left", [{ x: nodeIn.x, y: resistorA.y }]),
    wireBetween("w-branch-a", resistorA, "right", ledA, "left"),
    wireBetween("w-branch-a-out", ledA, "right", nodeOut, "left", [{ x: nodeOut.x, y: resistorA.y }]),
    wireBetween("w-branch-b-in", nodeIn, "right", resistorB, "left", [{ x: nodeIn.x, y: resistorB.y }]),
    wireBetween("w-branch-b", resistorB, "right", ledB, "left"),
    wireBetween("w-branch-b-out", ledB, "right", nodeOut, "left", [{ x: nodeOut.x, y: resistorB.y }]),
    // The return path back to the battery, around the bottom edge.
    wireBetween("w-return", nodeOut, "right", battery, "left", [
      { x: 600, y: 160 },
      { x: 600, y: 280 },
      { x: 60, y: 280 },
      { x: 60, y: 160 },
    ]),
  ];

  return {
    components,
    wires,
    frames: [
      circuitFrame(components, wires, "One switch, two branches — a resistor and an LED on each."),
      circuitFrame(components, wires, "The switch is open. Neither branch has a path yet.", toggle.id),
    ],
    summary: "Built a parallel circuit: one switch feeding two independent branches.",
  };
}

// ── Logic gates ──────────────────────────────────────────────────────────

const GATE_TRUTH_TABLES: Record<"and" | "or" | "not", (inputs: boolean[]) => boolean> = {
  and: (inputs) => inputs.every(Boolean),
  or: (inputs) => inputs.some(Boolean),
  not: (inputs) => !inputs[0],
};

/**
 * A two-input gate (one input for NOT) feeding an output value badge. Inputs
 * and the output are `kind: "value"` — the same 1/0 pill a person reads
 * without needing to know what "AND" means first. The output starts
 * `state: undefined` (drawn as "?" — nothing computed yet) and only turns
 * into a real 1/0, with its little checkmark, once this function has
 * actually decided the answer — matching the reference "pending → resolved"
 * feel exactly, not just fading a value in.
 */
export function evaluateGate(kind: "and" | "or" | "not", inputs: boolean[]): CircuitOpResult {
  const gate: CircuitComponent = { id: "gate", kind: `${kind}-gate` as const, x: 340, y: 130 };
  const output: CircuitComponent = { id: "output", kind: "value", x: 520, y: 130 };

  const inputTerminals: TerminalName[] = inputs.length === 1 ? ["in1"] : ["in1", "in2"];
  const inputYs = inputs.length === 1 ? [gate.y] : [gate.y - 40, gate.y + 40];

  const inputComponents: CircuitComponent[] = inputs.map((value, index) => ({
    id: `input-${index}`,
    kind: "value",
    x: 140,
    y: inputYs[index],
    state: value ? "high" : "low",
  }));

  const components = [...inputComponents, gate, output];

  // Straight where the input already lines up with its terminal (the NOT
  // case), bent where it doesn't (a 2-input gate's terminals sit close
  // together, so the two input wires have to converge without touching).
  const inputWires = inputComponents.map((input, index) => {
    const terminal = inputTerminals[index];
    const gatePoint = getTerminal(gate, terminal);
    const via = input.y === gatePoint.y ? [] : [{ x: 240, y: input.y }, { x: 240, y: gatePoint.y }];
    return wireBetween(`w-in-${index}`, input, "right", gate, terminal, via);
  });
  const outputWire = wireBetween("w-out", gate, "out", output, "left");
  const wires = [...inputWires, outputWire];

  const result = GATE_TRUTH_TABLES[kind](inputs);

  // Beat 1: inputs as given, output still pending. Beat 2: energize the
  // wires that are actually carrying a 1 — a false input never lights up,
  // which is what makes the truth table visible on the board rather than
  // only in a caption. Beat 3: the answer — wire, value and checkmark all
  // arrive on the same beat, so "resolved" reads as one event.
  const withInputsEnergized = wires.map((wire, index) =>
    index < inputWires.length ? { ...wire, energized: inputs[index] } : wire,
  );

  const finalWires = withInputsEnergized.map((wire) =>
    wire.id === outputWire.id ? { ...wire, energized: result } : wire,
  );
  const outputState: CircuitComponent["state"] = result ? "high" : "low";
  const finalComponents = components.map((component) =>
    component.id === output.id ? { ...component, state: outputState, resolved: true } : component,
  );

  const label = inputs.map((value) => (value ? "1" : "0")).join(", ");

  return {
    components: finalComponents,
    wires: finalWires,
    frames: [
      circuitFrame(components, wires, `Inputs: ${label}.`),
      circuitFrame(components, withInputsEnergized, "The wires carrying a 1 light up.", gate.id),
      circuitFrame(finalComponents, finalWires, `${kind.toUpperCase()}(${label}) = ${result ? "1" : "0"}.`, output.id),
    ],
    summary: `${kind.toUpperCase()} gate with inputs ${label} → output ${result ? "1" : "0"}.`,
  };
}

// ── Reset ────────────────────────────────────────────────────────────────

export function resetCircuit(): CircuitOpResult {
  return {
    components: [],
    wires: [],
    frames: [circuitFrame([], [], "The board is empty.")],
    summary: "Cleared the board.",
  };
}
