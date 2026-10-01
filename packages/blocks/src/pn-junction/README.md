# PN-junction block

An animated view of a PN junction: separate P/N material, depletion formation, charge labels, and forward or reverse bias.

## Use it

```tsx
import { PNJunctionView, formDepletionRegion, usePNJunctionPlayer } from "@unlockpi/blocks/pn-junction";

function JunctionDemo() {
  const { scene, run } = usePNJunctionPlayer();

  return (
    <>
      <button onClick={() => run(formDepletionRegion())}>Form junction</button>
      <PNJunctionView scene={scene} />
    </>
  );
}
```

For a fixed state:

```tsx
import { applyBias, PNJunctionView } from "@unlockpi/blocks/pn-junction";

<PNJunctionView scene={applyBias(0.7).scene} />
```

## Main props

`scene` is required; `className` controls layout and `showLegend={false}` hides supporting labels.

`PNJunctionScene` holds `proximity`, `depletionWidth`, `appliedVoltage`, `schematic`, `showChargeLabels`, `showCurrentFlow`, and `note`. Build it with `pnJunctionScene()` rather than manually repeating defaults.

## Preferred usage

Use `showSeparateBlocks`, `bringTogether`, `formDepletionRegion`, `showChargeLabels`, `applyBias`, and `resetJunction`. They return a complete target scene and a short summary. The view eases from the current scene to the target, including the carrier motion.

`depletionWidthFor()` and `biasRegime()` are the source of truth for the simplified teaching model. The block is pedagogical, not a SPICE-level diode simulator.
