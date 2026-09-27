/**
 * The data contract for `PNJunctionView` — same role as `waveform-frame.ts`:
 * a plain, serializable shape a demo, a canvas block, or eventually a live
 * voice agent can all produce without knowing about React. The physics
 * constants (the barrier voltage, the depletion-width formula) live here too,
 * for the same reason `modulationRegime()` lives in `waveform-frame.ts` and
 * not in the renderer: what a number MEANS is domain logic, not drawing.
 */

export type BiasRegime = "unbiased" | "reverse" | "partial-forward" | "forward";

export type PNJunctionScene = {
  /** 0 = the two blocks sit apart, not yet a junction; 1 = pressed together, touching at the center line. */
  proximity: number;
  /** 0 = no depletion region; 1 = the natural unbiased equilibrium width; >1 = widened (reverse bias); between 0 and 1 = narrowed (forward bias, not yet collapsed); exactly 0 while forward-biased = fully collapsed — current flows freely. */
  depletionWidth: number;
  /** Applied bias, in volts. 0 = unbiased. Negative = reverse. Positive = forward. */
  appliedVoltage: number;
  /** 0 = full microscopic detail — loose carriers, ions forming at the junction. 1 = flat schematic blocks + battery, the way this junction is actually drawn once it's a diode in a circuit. Lets the "zoom out into a circuit symbol" moment be an animation instead of a cut. */
  schematic: number;
  /** The "P: negatively charged / N: positively charged" captions — only meaningful once a depletion region actually exists. */
  showChargeLabels: boolean;
  /** The animated current indicator along the battery loop — only meaningful once the junction is actually conducting. */
  showCurrentFlow: boolean;
  note: string;
};

export const PN_WIDTH = 640;
export const PN_HEIGHT = 320;

/** Silicon's contact potential — the ~0.6V figure this component teaches. */
export const BARRIER_VOLTAGE = 0.6;

export function pnJunctionScene(partial: Partial<PNJunctionScene> & { note: string }): PNJunctionScene {
  return {
    proximity: 0,
    depletionWidth: 0,
    appliedVoltage: 0,
    schematic: 0,
    showChargeLabels: false,
    showCurrentFlow: false,
    ...partial,
  };
}

/**
 * The depletion region's width as a function of applied bias. Reverse bias
 * widens it (capped so the drawing stays sane at extreme voltages); forward
 * bias narrows it linearly until it collapses completely right at the
 * barrier voltage — the standard textbook model, not an approximation this
 * component invented.
 */
export function depletionWidthFor(voltage: number): number {
  if (voltage <= 0) return 1 + Math.min(-voltage, 2.5) * 0.5;
  if (voltage >= BARRIER_VOLTAGE) return 0;
  return 1 - voltage / BARRIER_VOLTAGE;
}

/** Pure classification of the applied voltage — no drawing, no color, same role as `modulationRegime()`. */
export function biasRegime(voltage: number): BiasRegime {
  if (voltage < -0.05) return "reverse";
  if (voltage <= 0.05) return "unbiased";
  if (voltage < BARRIER_VOLTAGE - 0.05) return "partial-forward";
  return "forward";
}
