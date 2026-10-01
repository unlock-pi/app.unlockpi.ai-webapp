# Circuit block

A fixed-size SVG teaching board for basic analog circuits and logic gates. Operations create complete circuit frames; the view only draws them.

## Use it

```tsx
import { CircuitView, createSeriesCircuit, useCircuitPlayer } from "@unlockpi/blocks/circuit";

function SeriesCircuitDemo() {
  const { frames } = createSeriesCircuit();
  const { frame, controls } = useCircuitPlayer();

  const current = frame ?? frames[0];
  return (
    <>
      <button onClick={() => controls.play(frames)}>Play</button>
      <CircuitView components={current.components} wires={current.wires} />
    </>
  );
}
```

For one static board:

```tsx
const circuit = createSeriesCircuit();
<CircuitView components={circuit.components} wires={circuit.wires} />;
```

## Main props

`components` and `wires` are required. Pass `activeComponentId` to focus the part currently being explained; `className` controls layout.

`CircuitComponent` carries an `id`, `kind`, board position, optional label, rotation, and state. `CircuitWire` is a list of board-coordinate points plus optional `energized` state. Use `getTerminal()` when building wires so endpoints stay aligned with symbols.

## Preferred usage

Build frames with `createSeriesCircuit`, `createParallelCircuit`, `toggleSwitch`, `evaluateGate`, or `resetCircuit`. These functions are pure and return a `CircuitOpResult` with final data, frames, and a summary.

Keep layout decisions in the operation that creates the circuit. `CircuitView` deliberately does not route wires, pan, zoom, or infer a topology.
