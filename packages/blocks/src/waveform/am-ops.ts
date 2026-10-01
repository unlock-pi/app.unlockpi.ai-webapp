/**
 * The domain logic — same role as `array-ops.ts` / `circuit-ops.ts`: pure
 * functions that know what a spoken command MEANS and return a target
 * `WaveformScene` plus a plain-English summary. Nothing in here touches
 * React, canvas, or timing — `WaveformView` decides how a transition to that
 * scene actually looks.
 *
 * Unlike `circuit-ops.ts`, these never need the board's current state as an
 * input: every command here fully states its own target (frequencies,
 * modulation index, which traces are visible), and the player eases the
 * scope from wherever it currently is to that target. That's possible
 * because an amplitude-modulation lesson has no notion of "which switch is
 * already closed" — every scene is a complete, self-sufficient picture.
 */
import type { SoundName } from "cuelume";

import { modulationRegime, waveformScene, type WaveformScene } from "./waveform-frame";

export type AMResult = {
  scene: WaveformScene;
  summary: string;
  startCue?: SoundName;
};

/** Fixed across every scene in this demo — only μ and which traces show ever change. Real teaching value is in that relationship, not in sweeping actual frequencies. */
const CARRIER_FREQUENCY = 10;
const MESSAGE_FREQUENCY = 1;

export function showCarrierWave(): AMResult {
  return {
    scene: waveformScene({
      carrierFrequency: CARRIER_FREQUENCY,
      messageFrequency: MESSAGE_FREQUENCY,
      modulationIndex: 0,
      visible: { carrier: true },
      note: "The carrier: high frequency, constant amplitude, and — on its own — carrying no information at all.",
    }),
    summary: "Showed the carrier wave alone.",
    startCue: "chime",
  };
}

export function showMessageWave(): AMResult {
  return {
    scene: waveformScene({
      carrierFrequency: CARRIER_FREQUENCY,
      messageFrequency: MESSAGE_FREQUENCY,
      modulationIndex: 0,
      visible: { message: true },
      note: "The message: the actual signal that needs to travel — far too low a frequency to broadcast efficiently by itself.",
    }),
    summary: "Showed the message signal alone.",
    startCue: "chime",
  };
}

export function modulateAt(index: number): AMResult {
  const regime = modulationRegime(index);
  const note =
    regime === "over"
      ? `Past 100% modulation — the envelope now crosses zero. A simple envelope detector can no longer trace the message back out cleanly: this is real distortion, not a rendering artifact.`
      : regime === "ideal"
        ? `Exactly μ = 1 — the envelope just touches zero at its lowest point. The textbook-ideal case: maximum signal without over-modulating.`
        : `μ = ${index.toFixed(2)} — the carrier's amplitude now follows the message's shape. Under-modulated: the message is there, just recovered at lower strength.`;

  return {
    scene: waveformScene({
      carrierFrequency: CARRIER_FREQUENCY,
      messageFrequency: MESSAGE_FREQUENCY,
      modulationIndex: index,
      visible: { modulated: true, envelope: true },
      note,
    }),
    summary: `Modulated the carrier at μ = ${index.toFixed(2)} (${regime}).`,
    startCue: "toggle",
  };
}

export function showSpectrumAt(index: number): AMResult {
  return {
    scene: waveformScene({
      carrierFrequency: CARRIER_FREQUENCY,
      messageFrequency: MESSAGE_FREQUENCY,
      modulationIndex: index,
      visible: { modulated: true, envelope: true, spectrum: true },
      note: "Same signal, frequency domain: a line at fc and one sideband on each side, fm away. That spacing is the whole bandwidth AM actually costs you.",
    }),
    summary: "Revealed the frequency-domain spectrum.",
    startCue: "scan",
  };
}

export function resetWaveform(): AMResult {
  return {
    scene: waveformScene({
      carrierFrequency: CARRIER_FREQUENCY,
      messageFrequency: MESSAGE_FREQUENCY,
      modulationIndex: 0,
      visible: {},
      note: "",
    }),
    summary: "Cleared the scope.",
    startCue: "release",
  };
}
