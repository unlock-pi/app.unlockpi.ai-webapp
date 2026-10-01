# UnlockPi

UnlockPi is a canvas-based teaching tool for tutors and trainers. Teachers build a lesson from visual blocks, present it frame by frame, and can use live AI assistance during class.

## Repository map

- `apps/web` - the Next.js application: authoring, presentation, realtime sessions, and persistence.
- `packages/blocks` - reusable educational visualizations and their pure teaching operations.
- `packages/ui` - the small shared UI foundation used by packages.
- `packages/realtime` - reserved for shared realtime code; it is currently a placeholder.

## Run it

```bash
bun install
bun dev
```

Useful checks:

```bash
bun lint
bun typecheck
bun build
```

The web app redirects `/` to `/dashboard`.

## Working conventions

- Import educational primitives from `@unlockpi/blocks/<concept>`, never from a file inside a concept directory.
- Keep concept logic and its renderer together in `packages/blocks`; keep canvas, persistence, and realtime orchestration in `apps/web`.
- A Puck canvas block in the web app is integration glue around a block-package primitive, not the primitive itself.

Start with `apps/web` for product behavior, or `packages/blocks/README.md` when adding or changing a visualization.
