/**
 * Re-export shim — the real implementation moved to `@unlockpi/ui` as part
 * of extracting the `blocks` package (see `packages/blocks/README.md`).
 * Existing imports of `@/lib/utils` keep working unchanged; new UI code
 * should import `cn` from `@unlockpi/ui` directly.
 */
export { cn } from "@unlockpi/ui";
