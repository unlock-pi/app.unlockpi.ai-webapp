"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronUpIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DockAction = {
  id: string;
  /** Shown when the dock is expanded, and as the button's accessible name. */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Lit state — a mode that is on, a mic that is live. */
  active?: boolean;
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Replaces the icon with short text, for the "HI" style button. */
  text?: string;
};

type Props = {
  /** Always visible, as circles, in the order given. */
  primary: DockAction[];
  /** Revealed on expand — the things a teacher reaches for less often. */
  secondary?: DockAction[];
  /** The pill above the dock: a live caption, or a keyboard hint. */
  hint?: ReactNode;
  className?: string;
};

const SPRING = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };

/**
 * The presenter's controls: a compact row of circles that morphs into a
 * labelled bar.
 *
 * Compact is the resting state because a teacher presenting wants the board,
 * not the chrome — but an icon-only dock is unguessable, so expanding names
 * every control and reveals the rest instead of hiding them behind a menu.
 */
export function PresenterDock({ primary, secondary = [], hint, className }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasSecondary = secondary.length > 0;

  return (
    <div className={cn("pointer-events-auto flex flex-col items-center gap-2.5", className)}>
      <AnimatePresence>
        {hint ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={SPRING}
            className="max-w-[min(90vw,42rem)] rounded-full bg-neutral-950/95 px-4 py-2 text-center text-sm text-neutral-100 shadow-lg ring-1 ring-white/10 backdrop-blur-md dark:bg-neutral-900/95"
          >
            {hint}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        layout
        transition={SPRING}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          "flex items-center",
          // Expanded, the circles merge into one bar; compact, they float as
          // separate buttons. `layout` animates between the two.
          expanded
            ? "gap-1 rounded-full bg-neutral-950/95 p-1.5 shadow-xl ring-1 ring-white/10 backdrop-blur-md dark:bg-neutral-900/95"
            : "gap-2",
        )}
      >
        <AnimatePresence initial={false}>
          {expanded
            ? secondary.map((action) => (
                <motion.div
                  key={action.id}
                  layout
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={SPRING}
                >
                  <DockButton action={action} expanded />
                </motion.div>
              ))
            : null}
        </AnimatePresence>

        {primary.map((action) => (
          <motion.div key={action.id} layout transition={SPRING}>
            <DockButton action={action} expanded={expanded} standalone={!expanded} />
          </motion.div>
        ))}

        {hasSecondary ? (
          <motion.button
            layout
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-label={expanded ? "Fewer controls" : "More controls"}
            aria-expanded={expanded}
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full text-neutral-300 transition-colors hover:text-white",
              expanded ? "hover:bg-white/10" : "bg-neutral-950/95 shadow-lg ring-1 ring-white/10 dark:bg-neutral-900/95",
            )}
          >
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={SPRING}>
              <ChevronUpIcon className="size-4" />
            </motion.span>
          </motion.button>
        ) : null}
      </motion.div>
    </div>
  );
}

function DockButton({
  action,
  expanded,
  standalone,
}: {
  action: DockAction;
  expanded: boolean;
  standalone?: boolean;
}) {
  const danger = action.tone === "danger";

  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.label}
      aria-pressed={action.active}
      title={action.label}
      className={cn(
        "flex h-11 shrink-0 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        expanded ? "px-3.5" : "w-11",
        standalone
          ? "bg-neutral-950/95 shadow-lg ring-1 ring-white/10 dark:bg-neutral-900/95"
          : "hover:bg-white/10",
        danger ? "text-red-400 hover:text-red-300" : "text-neutral-200 hover:text-white",
        action.active && !danger && "bg-white/15 text-white",
      )}
    >
      <span className="grid size-5 shrink-0 place-items-center">
        {action.text ? (
          <span className="text-xs font-bold tracking-wide">{action.text}</span>
        ) : (
          action.icon
        )}
      </span>
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={SPRING}
            className="overflow-hidden whitespace-nowrap"
          >
            {action.label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </button>
  );
}
