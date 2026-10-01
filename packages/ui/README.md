# `@unlockpi/ui`

Small shared UI primitives for workspace packages. It currently exports `cn`, `Badge`, and tooltip components.

## Use it

```tsx
import { Badge, Tooltip, TooltipPopup, TooltipTrigger, cn } from "@unlockpi/ui";

<Badge className={cn("text-xs", isActive && "bg-emerald-600")}>Active</Badge>
```

## Preferred usage

- Use this package when a primitive is needed by more than the web app.
- Keep the package independent: it must not import `@unlockpi/blocks` or `@/` paths from the app.
- Leave app-only primitives in `apps/web/src/components/ui` until they have a real second consumer.

## Adding a primitive

Move the implementation here, export it from `src/index.ts`, and leave an app-level re-export if existing app imports need to remain stable. Run `bun --filter @unlockpi/ui typecheck` afterward.
