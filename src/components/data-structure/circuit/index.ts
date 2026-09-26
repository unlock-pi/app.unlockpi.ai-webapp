/**
 * The circuit module's public API. Anything outside this folder imports from
 * here — `@/components/data-structure/circuit` — never from a file inside it
 * directly. Same rule as `@/components/data-structure/array`.
 */
export { CircuitView } from "@/components/data-structure/circuit/circuit-view";
export type { CircuitViewProps } from "@/components/data-structure/circuit/circuit-view";

export {
  CIRCUIT_HEIGHT,
  CIRCUIT_WIDTH,
  LEAD,
  circuitFrame,
  getTerminal,
} from "@/components/data-structure/circuit/circuit-frame";
export type {
  CircuitComponent,
  CircuitComponentKind,
  CircuitFrame,
  CircuitWire,
  TerminalName,
} from "@/components/data-structure/circuit/circuit-frame";
