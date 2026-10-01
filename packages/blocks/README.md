# `@unlockpi/blocks`

Reusable educational visualizations for UnlockPi. A concept owns its renderer, scene/frame types, pure teaching operations, and optional player hook.

## Available concepts

```ts
import { ArrayView } from "@unlockpi/blocks/array";
import { AutomatonBlock } from "@unlockpi/blocks/automata";
import { CircuitView } from "@unlockpi/blocks/circuit";
import { ContextFreeGrammarBlock } from "@unlockpi/blocks/context-free-grammar";
import { GraphBlock } from "@unlockpi/blocks/graph";
import { PDABlock } from "@unlockpi/blocks/pda";
import { RegularExpressionBlock } from "@unlockpi/blocks/regular-expression";
import { TMBlock } from "@unlockpi/blocks/tm";
import { TreeRenderer } from "@unlockpi/blocks/trees";
import { WaveformView } from "@unlockpi/blocks/waveform";
import { PNJunctionView } from "@unlockpi/blocks/pn-junction";
```

Each concept has a short README beside its source with its props and example.

The restored `src/tm` and `src/trees` folders now resolve imports within the
package. The web app currently uses its copies in `apps/web/src/components`.

## How it works

Operations create plain scene data; the view renders that data. This keeps the visual layer usable from a pre-authored lesson, a canvas block, or a realtime tool.

```ts
import { createSeriesCircuit, CircuitView } from "@unlockpi/blocks/circuit";

const circuit = createSeriesCircuit();
<CircuitView components={circuit.components} wires={circuit.wires} />;
```

## Preferred boundaries

- Import only from a concept's public subpath, such as `@unlockpi/blocks/array`.
- Keep React, browser APIs, canvas documents, and realtime sessions out of pure operation files.
- Put Puck configuration and application-specific orchestration in `apps/web`.
- Depend only on `@unlockpi/ui`; never import the web app through its `@/` alias.

## Adding a concept

Create a concept directory with a public `index.ts`, typed scene/frame data, a view, pure operations where useful, and this style of README. Add its subpath to `package.json` exports, then run `bun --filter @unlockpi/blocks typecheck`.
