/**
 * The data contract for `WaveformView` — same role as `circuit-frame.ts` and
 * `array-frame.ts`: a plain, serializable shape that a demo, a canvas block,
 * or (eventually) a live voice agent can all produce without knowing about
 * each other or about React.
 *
 * `WaveformScene` is deliberately built for amplitude modulation specifically
 * (a carrier, a message, a modulation index) rather than as a generic
 * "plot anything" type. A truly generic waveform type would need a formula
 * or a sample array per trace, and either choice drags real complexity in
 * for no current benefit — see the module README's "why AM-shaped, not
 * generic" section before widening this for a second concept (FM, sampling,
 * filters, ...). Widen it then, with a second real use in hand, not now on
 * a guess.
 */

/** Which traces are currently on screen. Toggling one fades it in/out — see WaveformView. */
export type WaveformVisibility = {
  carrier: boolean;
  message: boolean;
  modulated: boolean;
  envelope: boolean;
  spectrum: boolean;
};

/**
 * One target state for the scope to ease towards. Not a single instant like
 * `ArrayFrame`/`CircuitFrame` — see the README's "why this player is
 * different" section for why a continuously-oscillating signal can't be
 * pre-baked into discrete frames the way a sort step or a wire lighting up
 * can, without either choppy playback or an absurd frame count.
 */
export type WaveformScene = {
  /** Cycles of the carrier visible across the plotted window. Kept as "cycles on screen," not real Hz — this is a teaching picture, not an instrument. */
  carrierFrequency: number;
  /** Cycles of the message visible across the plotted window. Always well below carrierFrequency — that gap is what makes modulation visible at all. */
  messageFrequency: number;
  /** μ = Am / Ac. 0 = no modulation, 1 = 100% (textbook-ideal), >1 = over-modulation (the envelope crosses zero — a real distortion, not a rendering artifact). */
  modulationIndex: number;
  visible: WaveformVisibility;
  /** One short line explaining this scene, same role as ArrayFrame.note / CircuitFrame.note. */
  note: string;
};

export const WAVEFORM_WIDTH = 640;
export const WAVEFORM_HEIGHT = 320;

const HIDDEN: WaveformVisibility = {
  carrier: false,
  message: false,
  modulated: false,
  envelope: false,
  spectrum: false,
};

/** Build one scene. Only `note` is required — everything else defaults to "nothing on screen yet," so a caller only states what it's actually changing. */
export function waveformScene(
  partial: Partial<Omit<WaveformScene, "visible">> & {
    note: string;
    visible?: Partial<WaveformVisibility>;
  },
): WaveformScene {
  const { visible, ...rest } = partial;
  return {
    carrierFrequency: 10,
    messageFrequency: 1,
    modulationIndex: 0.5,
    ...rest,
    visible: { ...HIDDEN, ...visible },
  };
}

export type ModulationRegime = "none" | "under" | "ideal" | "over";

/**
 * Pure classification of μ — no drawing, no color, just "which textbook case
 * is this." WaveformView turns this into a badge; nothing about the meaning
 * of "over-modulated" belongs in the renderer.
 */
export function modulationRegime(index: number): ModulationRegime {
  if (index <= 0.02) return "none";
  if (index < 0.97) return "under";
  if (index <= 1.03) return "ideal";
  return "over";
}
