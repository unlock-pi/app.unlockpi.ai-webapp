# `@unlockpi/blocks`

The educational visualization components — `array`, `circuit`, `waveform`,
`pn-junction` — extracted from the app into their own workspace package.
Each one keeps its own README (`src/<concept>/README.md`) with the actual
design reasoning for that concept; this file is about the PACKAGE, not any
one visualization.

## Why this split happened

By the time `pn-junction` shipped, four view files alone totaled over 2,400
lines (`array-view.tsx` 657, `circuit-view.tsx` 509, `pn-junction-view.tsx`
452, `waveform-view.tsx` 394), all living inside the main app's
`src/components/data-structure/` (now `apps/web/src/components/data-structure/`). That's not a complaint about any single
file's quality — each one's README explains real, deliberate design
decisions — it's that "everything educational lives inside the app" stopped
giving a team of four a clean place to divide work. Someone touching the
Puck canvas editor and someone building the next visualization concept were
one accidental import away from stepping on each other.

## Import from here, not from inside a concept folder

```ts
import { ArrayView } from "@unlockpi/blocks/array";
import { CircuitView } from "@unlockpi/blocks/circuit";
import { WaveformView } from "@unlockpi/blocks/waveform";
import { PNJunctionView } from "@unlockpi/blocks/pn-junction";
```

Each concept is its own subpath export (see `exports` in `package.json`),
not one flat barrel — this keeps the import shape close to what it was
before the move (swap the source string, keep the named imports), and avoids
forcing every consumer to pull in all four concepts' types just to use one.

## What a "block" actually is, and isn't

A block is a **dumb-ish renderer**: it draws exactly the scene/frame data
it's handed and knows nothing about what a spoken command means, what an
AI agent is, or how a lesson gets authored. The "dumb-ish" hedge matters —
`waveform` and `pn-junction` both own a small, explicitly-justified exception
(easing toward a new scene, running an idle-motion clock) because a live,
continuously-oscillating signal can't be pre-baked into discrete frames the
way an array's sort step can. Read the exception before copying it into a
new concept without checking whether it actually applies.

**Not the same thing as a Puck "\*Block."** The app's canvas editor
(`apps/web/src/features/canvas/components/canvas-puck-config.tsx`) has its own
`ArrayBlock`, `CircuitBlock`, etc. — those are Puck-specific glue (fields,
defaultProps, a render function) that WRAP the real primitives from this
package for the slide-authoring UI. That glue stays in the app; only the
primitives (`ArrayView`, `CircuitView`, ...) live here. Two different
things share a similar name because they're used together, not because
they're the same concept — see the naming discussion this package's
extraction came out of if that's confusing in a PR.

## Dependency direction

`@unlockpi/blocks` depends on `@unlockpi/ui` for `Badge`, `Tooltip`, and
`cn` — never the other way round, and never back into the app's `@/*` alias.
Both directions are enforced by `no-restricted-imports` rules in the root
`eslint.config.mjs`, scoped to `packages/**`. If a concept genuinely needs a
UI primitive that isn't in `@unlockpi/ui` yet, add it there — don't reach
into the app to borrow it.

One block concept also can't import another's internals directly (array
reaching into circuit's files, say) — also enforced by the same lint config.
If two concepts need to share something real, it belongs in `@unlockpi/ui`
or a new small shared module in this package, not a cross-import.

## Why this is source, not a build step

`package.json`'s `main`/`types` point straight at `src/index.ts`-equivalent
files — there's no `dist/`, no compile step. The app's `next.config.ts` lists
this package in `transpilePackages`, which makes Next compile it in place as
part of the app's own build, exactly like app source — including Fast
Refresh during development. This only works because the package is consumed
via the workspace (`"@unlockpi/blocks": "workspace:*"`), not installed from
a registry; the day this gets published externally, it needs an actual build
step. It doesn't need one today, and adding one now would just be dead
machinery.

## Adding a fifth concept

Follow the existing shape: `<concept>/<concept>-frame.ts` (pure types + pure
domain math, zero React), `<concept>/<concept>-view.tsx` (the renderer),
`<concept>/index.ts` (the barrel — the only path anything outside the folder
imports from), `<concept>/README.md` (the actual design reasoning). Add the
subpath to `package.json`'s `exports`. The concept-specific `*-ops.ts` (what
a spoken command means) does NOT move here — that stays in
`apps/web/src/features/<concept>/lib/` in the app, same as every existing concept.
