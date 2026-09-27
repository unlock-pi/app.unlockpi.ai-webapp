/**
 * The circuit module's public API. Anything outside this folder imports from
 * here — `@unlockpi/blocks/circuit` — never from a file inside it directly.
 * Same rule as every other concept in this package.
 *
 * This is the whole concept, not just its rendering: types, the pure ops a
 * spoken command or agent tool calls, and the player hook that eases a view
 * between them. A consumer needing "everything about circuits" gets it from
 * one import, not three — see the package README's "one purpose per
 * concept" reasoning for why ops live here now, not in the app.
 */
export { CircuitView } from "./circuit-view";
export type { CircuitViewProps } from "./circuit-view";

export {
  CIRCUIT_HEIGHT,
  CIRCUIT_WIDTH,
  LEAD,
  circuitFrame,
  getTerminal,
} from "./circuit-frame";
export type {
  CircuitComponent,
  CircuitComponentKind,
  CircuitFrame,
  CircuitWire,
  TerminalName,
} from "./circuit-frame";

export {
  createParallelCircuit,
  createSeriesCircuit,
  evaluateGate,
  resetCircuit,
  toggleSwitch,
} from "./circuit-ops";
export type { CircuitOpResult } from "./circuit-ops";

export { useCircuitPlayer } from "./use-circuit-player";
