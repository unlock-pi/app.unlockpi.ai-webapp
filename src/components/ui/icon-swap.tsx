import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Cross-fades between two icons in the same slot — mic on/off, power
 * connect/disconnect, sun/moon, any binary icon toggle. Both icons stay
 * mounted; only `state` changes, so the swap is a CSS transition rather than
 * a mount/unmount snap. See .claude/skills/transitions-dev/09-icon-swap.md —
 * the CSS itself lives in globals.css under ".t-icon-swap".
 */
export function IconSwap({
  state,
  iconA,
  iconB,
  className,
}: {
  state: "a" | "b";
  iconA: ReactNode;
  iconB: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("t-icon-swap", className)} data-state={state}>
      <span className="t-icon" data-icon="a" aria-hidden={state !== "a"}>
        {iconA}
      </span>
      <span className="t-icon" data-icon="b" aria-hidden={state !== "b"}>
        {iconB}
      </span>
    </span>
  );
}
