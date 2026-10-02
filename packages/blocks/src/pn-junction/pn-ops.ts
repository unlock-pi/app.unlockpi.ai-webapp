/**
 * The domain logic — same role as `am-ops.ts`: pure functions that know what
 * a spoken command MEANS and return a complete target `PNJunctionScene` plus
 * a plain-English summary. Every function here is self-sufficient (no
 * "current board" input needed) for the same reason `am-ops.ts` is — each
 * scene fully states its own target, and the view eases from wherever it
 * currently is to that target.
 */
import type { SoundName } from "cuelume";

import { BARRIER_VOLTAGE, depletionWidthFor, pnJunctionScene, type PNJunctionScene } from "./pn-junction-frame";

export type PNResult = {
  scene: PNJunctionScene;
  summary: string;
  startCue?: SoundName;
};

export function showSeparateBlocks(): PNResult {
  return {
    scene: pnJunctionScene({
      proximity: 0,
      note: "A P-type block — holes, the absence of an electron — and an N-type block, full of free electrons. Not touching yet.",
    }),
    summary: "Showed the two blocks apart.",
    startCue: "success",
  };
}

export function bringTogether(): PNResult {
  return {
    scene: pnJunctionScene({
      proximity: 1,
      note: "Bring them into contact — this interface is the pn junction. Carriers near the boundary start to interact.",
    }),
    summary: "Brought the P and N blocks together.",
    startCue: "navigate",
  };
}

export function formDepletionRegion(): PNResult {
  return {
    scene: pnJunctionScene({
      proximity: 1,
      depletionWidth: 1,
      note: "Holes and electrons right at the junction recombine. What's left behind are fixed ions — negative on the P side, positive on the N side — and a carrier-free depletion region between them.",
    }),
    summary: "Formed the depletion region.",
    startCue: "open",
  };
}

export function showChargeLabels(): PNResult {
  return {
    scene: pnJunctionScene({
      proximity: 1,
      depletionWidth: 1,
      showChargeLabels: true,
      note: `That separation of charge is the contact potential — about ${BARRIER_VOLTAGE}V in silicon. It's the barrier any current has to overcome to cross the junction.`,
    }),
    summary: "Revealed the contact-potential charge labels.",
    startCue: "select",
  };
}

export function applyBias(voltage: number): PNResult {
  const depletionWidth = depletionWidthFor(voltage);
  const conducting = voltage >= BARRIER_VOLTAGE;
  const note =
    voltage < 0
      ? `${voltage.toFixed(1)}V reverse bias — the battery's polarity matches the barrier, widening the depletion region further. Essentially no current flows.`
      : conducting
        ? `${voltage.toFixed(1)}V forward — past the ${BARRIER_VOLTAGE}V barrier, so the depletion region has fully collapsed and current flows freely.`
        : `${voltage.toFixed(1)}V forward — below the ${BARRIER_VOLTAGE}V barrier, so the depletion region has only narrowed. Still very little current.`;

  return {
    scene: pnJunctionScene({
      proximity: 1,
      depletionWidth,
      appliedVoltage: voltage,
      schematic: 1,
      showCurrentFlow: conducting,
      note,
    }),
    summary: `Applied ${voltage.toFixed(1)}V (${voltage < 0 ? "reverse" : "forward"}).`,
    startCue: conducting ? "success" : "toggle",
  };
}

export function resetJunction(): PNResult {
  return {
    scene: pnJunctionScene({ note: "" }),
    summary: "Reset the junction.",
    startCue: "tap",
  };
}
