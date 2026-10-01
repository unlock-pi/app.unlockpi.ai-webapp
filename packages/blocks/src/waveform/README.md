# Waveform block

An amplitude-modulation teaching scope. It draws carrier, message, modulated, envelope, and spectrum traces from one `WaveformScene`.

## Use it

```tsx
import { WaveformView, modulateAt, useWaveformPlayer } from "@unlockpi/blocks/waveform";

function ModulationDemo() {
  const { scene, run } = useWaveformPlayer();

  return (
    <>
      <button onClick={() => run(modulateAt(1))}>Show 100% modulation</button>
      <WaveformView scene={scene} />
    </>
  );
}
```

For a fixed scene:

```tsx
import { waveformScene, WaveformView } from "@unlockpi/blocks/waveform";

<WaveformView scene={waveformScene({ note: "Carrier and message", visible: { carrier: true, message: true } })} />
```

## Main props

`scene` is required. `className` changes its layout and `showLegend={false}` is useful in a compact comparison.

`WaveformScene` has `carrierFrequency`, `messageFrequency`, `modulationIndex`, `visible`, and `note`. Frequencies mean cycles across the drawing, not physical Hz. `waveformScene()` supplies sensible defaults and lets callers provide only what changes.

## Preferred usage

Use `showCarrierWave`, `showMessageWave`, `modulateAt`, `showSpectrumAt`, and `resetWaveform` to build scenes. The component itself continuously animates toward a new scene, so it does not use discrete animation frames.

This module is intentionally AM-shaped. Add FM, PM, sampling, or another concept only when it has a real scene contract of its own.
