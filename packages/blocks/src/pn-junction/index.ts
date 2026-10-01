/**
 * The whole pn-junction concept, not just its rendering: types, the pure ops
 * a spoken command calls, and the player hook — see the package README's
 * "one purpose per concept" reasoning.
 */
export {
  BARRIER_VOLTAGE,
  biasRegime,
  depletionWidthFor,
  PN_HEIGHT,
  PN_WIDTH,
  pnJunctionScene,
  type BiasRegime,
  type PNJunctionScene,
} from "./pn-junction-frame";
export { PNJunctionView, type PNJunctionViewProps } from "./pn-junction-view";

export {
  applyBias,
  bringTogether,
  formDepletionRegion,
  resetJunction,
  showChargeLabels,
  showSeparateBlocks,
} from "./pn-ops";
export type { PNResult } from "./pn-ops";

export { usePNJunctionPlayer } from "./use-pn-junction-player";
