/**
 * The whole amplitude-modulation concept, not just its rendering: types, the
 * pure ops a spoken command calls, and the player hook — see the package
 * README's "one purpose per concept" reasoning.
 */
export {
  modulationRegime,
  WAVEFORM_HEIGHT,
  WAVEFORM_WIDTH,
  waveformScene,
  type ModulationRegime,
  type WaveformScene,
  type WaveformVisibility,
} from "./waveform-frame";
export { WaveformView, type WaveformViewProps } from "./waveform-view";

export {
  modulateAt,
  resetWaveform,
  showCarrierWave,
  showMessageWave,
  showSpectrumAt,
} from "./am-ops";
export type { AMResult } from "./am-ops";

export { useWaveformPlayer } from "./use-waveform-player";
