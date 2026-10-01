/**
 * Re-export shim — the real implementation moved to `@unlockpi/ui` as part
 * of extracting the `blocks` package (see `packages/blocks/README.md`).
 * Existing imports of `@/components/ui/badge` keep working unchanged; new
 * code should import from `@unlockpi/ui` directly.
 */
export { Badge, badgeVariants, type BadgeProps } from "@unlockpi/ui";
