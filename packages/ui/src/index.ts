/**
 * `@unlockpi/ui`'s public surface. Deliberately small — this package holds
 * the primitives `@unlockpi/blocks` needs today (including Badge, Tooltip,
 * controls, input and tree views), not every Base UI wrapper in the app.
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
export { Button, Input } from "./button";
export { ExecutionControls, type ExecutionControlsProps } from "./execution-controls";
export { InputString, type InputStringProps, type InputSequenceResult } from "./input-string";
export { TreeDiagram, type TreeDiagramData, type TreeDiagramNode } from "./tree-diagram";
