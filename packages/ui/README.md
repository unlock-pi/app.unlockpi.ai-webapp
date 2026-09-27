# `@unlockpi/ui`

Shared Base UI-based primitives, extracted specifically because
`@unlockpi/blocks` needed somewhere to get `Badge`, `Tooltip`, and `cn` from
that wasn't reaching back into the main app.

## Deliberately small — read this before adding the other 60 primitives

The app has ~63 UI primitives under `apps/web/src/components/ui/`. This package
holds exactly **two** of them (`badge.tsx`, `tooltip.tsx`) plus the `cn`
helper. That's not an oversight — it's every primitive `@unlockpi/blocks`
actually imports today, verified by grepping the four view files before this
package existed. Moving all 63 in one pass, most of them unverified against
this package's actual needs, would have been a much larger and riskier
change for no immediate benefit.

**Grow this package on demand**, when a real second consumer needs a
specific primitive — not ahead of that need. When you do add one: move the
real file here (`git mv`), fix its internal imports to be relative /
`@unlockpi/ui`-based, export it from `src/index.ts`, and leave a thin
re-export shim at its old `apps/web/src/components/ui/<name>.tsx` path in the app so
every existing consumer there keeps working unchanged. `badge.tsx`,
`tooltip.tsx`, and `apps/web/src/lib/utils.ts` are shimmed exactly this way right
now — read one of those shims before adding the next.

## Why `cn` is canonical here, not in the app

`cn` (a 3-line `clsx` + `tailwind-merge` wrapper) had ~130 consumers across
the app before this package existed. Rewriting 130 import paths for a
package extraction is a bad trade for what it buys. Instead, `src/lib/utils.ts`
in the app is now a one-line re-export: `export { cn } from "@unlockpi/ui";`
— every existing consumer is untouched, and this package is the single real
implementation.

## Dependency direction

This package must never import `@unlockpi/blocks` — enforced by a
`no-restricted-imports` rule in the root `eslint.config.mjs`. `ui` is the
foundation `blocks` depends on; the reverse would be a cycle.
