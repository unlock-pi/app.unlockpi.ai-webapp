/**
 * `@unlockpi/ui`'s public surface. Deliberately small — this package holds
 * exactly the primitives `@unlockpi/blocks` needs today (Badge, Tooltip, the
 * `cn` helper), not a wholesale port of every Base UI wrapper in the app.
 * Grow it when a real second consumer needs a specific primitive, not ahead
 * of that need — see the package README.
 */
export { Badge, badgeVariants, type BadgeProps } from "./badge";
export {
  Tooltip,
  TooltipContent,
  TooltipCreateHandle,
  TooltipPopup,
  TooltipPrimitive,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
export { cn } from "./utils";
