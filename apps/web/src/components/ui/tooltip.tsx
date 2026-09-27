/**
 * Re-export shim — the real implementation moved to `@unlockpi/ui` as part
 * of extracting the `blocks` package (see `packages/blocks/README.md`).
 * Existing imports of `@/components/ui/tooltip` keep working unchanged; new
 * code should import from `@unlockpi/ui` directly.
 */
export {
  Tooltip,
  TooltipContent,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipPrimitive,
  TooltipProvider,
  TooltipTrigger,
} from "@unlockpi/ui";
