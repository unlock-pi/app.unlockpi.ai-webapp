"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  DEFAULT_RULE_COLORS,
  colorFor,
  gradientStop,
  matchesFor,
  type HighlightRule,
} from "@/components/data-structure/number-cell-shared";
import { cn } from "@/lib/utils";

export type { HighlightRule } from "@/components/data-structure/number-cell-shared";

export type NumberPaginationStripProps = {
  /** Highest number in the list. Numbers always start at 1. Supports 1..1000. */
  total?: number;
  /** ascending (1..total) or descending (total..1). */
  order?: "ascending" | "descending";
  /** "factorial" joins adjacent visible cells with a × separator. */
  mode?: "list" | "factorial";
  /** How many numbers stay pinned at the very start. */
  leadCount?: number;
  /** How many numbers stay pinned at the very end. */
  trailCount?: number;
  /** How many consecutive numbers are revealed around the dragged position. */
  windowSize?: number;
  /** Combinable highlight rules. A number matching several gets a combined marker. */
  highlights?: HighlightRule[];
  /** When set, every visible number is struck through (if evenly divisible) or badged with its remainder. */
  division?: { divisor: number } | null;
  /**
   * The number a traversal is visiting right now. Pulls the window to follow
   * it and renders it larger, with its own ring — distinct from a static
   * highlight, so "matches the rule" and "being visited this instant" read as
   * different intensities. `null`/omitted outside a traversal.
   */
  cursor?: number | null;
  /** A running result (product, sum, collected list) shown beside the strip. */
  accumulator?: { label: string; value: string } | null;
  /**
   * Pull every number matching a highlight rule out of the main row into its
   * own tray below — "bring out the highlighted elements". The main row lets
   * them go (they animate out); the tray catches them (they animate in) —
   * the split itself is the point, not just a recolor.
   */
  extracted?: boolean;
  className?: string;
  /** Called once the drag ends (pointer released, or dragged out of bounds). */
  onSettle?: (value: number) => void;
};

type EllipsisItem = { ellipsis: true; from: number; to: number; key: string };
type StripItem = number | EllipsisItem;

function range(start: number, end: number): number[] {
  if (end < start) return [];
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

/**
 * Classic pagination truncation, but driven by a continuous `current` instead
 * of discrete page clicks: a fixed lead block, a fixed trail block, and a
 * `windowSize`-wide slice of consecutive numbers that slides around
 * `current`, merging into whichever block it touches. Always computed over
 * the ascending 1..total domain; `order` only affects display (see render).
 */
function buildItems({
  current,
  total,
  leadCount,
  trailCount,
  windowSize,
}: {
  current: number;
  total: number;
  leadCount: number;
  trailCount: number;
  windowSize: number;
}): StripItem[] {
  if (total <= leadCount + trailCount + windowSize) {
    return range(1, total);
  }

  const half = Math.floor(windowSize / 2);
  let winStart = current - half;
  let winEnd = winStart + windowSize - 1;
  if (winStart < 1) {
    winEnd += 1 - winStart;
    winStart = 1;
  }
  if (winEnd > total) {
    winStart -= winEnd - total;
    winEnd = total;
  }

  const leadEnd = leadCount;
  const trailStart = total - trailCount + 1;

  const mergesLeft = winStart <= leadEnd + 2;
  const mergesRight = winEnd >= trailStart - 2;

  if (mergesLeft && mergesRight) {
    return range(1, total);
  }
  if (mergesLeft) {
    const end = Math.max(leadEnd, winEnd);
    return [
      ...range(1, end),
      { ellipsis: true, from: end + 1, to: trailStart - 1, key: "e-right" },
      ...range(trailStart, total),
    ];
  }
  if (mergesRight) {
    const start = Math.min(winStart, trailStart);
    return [
      ...range(1, leadCount),
      { ellipsis: true, from: leadCount + 1, to: start - 1, key: "e-left" },
      ...range(start, total),
    ];
  }
  return [
    ...range(1, leadCount),
    { ellipsis: true, from: leadCount + 1, to: winStart - 1, key: "e-left" },
    ...range(winStart, winEnd),
    { ellipsis: true, from: winEnd + 1, to: trailStart - 1, key: "e-right" },
    ...range(trailStart, total),
  ];
}

const CELL_SPRING = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.6 };
const TRACK_SPRING = { type: "spring" as const, stiffness: 260, damping: 28, mass: 0.5 };

/** How many pulled-out numbers the tray renders before summarizing the rest. */
const MAX_TRAY_CELLS = 48;
const TRAY_STAGGER_S = 0.02;

export function NumberPaginationStrip({
  total = 100,
  order = "ascending",
  mode = "list",
  leadCount = 5,
  trailCount = 4,
  windowSize = 6,
  highlights = [],
  division = null,
  cursor = null,
  accumulator = null,
  extracted = false,
  className,
  onSettle,
}: NumberPaginationStripProps) {
  const [current, setCurrent] = useState(1);
  const [settledValue, setSettledValue] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // A traversal drives the window itself — the class should see the cursor
  // slide across, not have to go find it. Adjusting state during render
  // (React's documented pattern for "derive from a changed prop") instead of
  // an effect, so the window updates in the same commit the cursor moves in
  // rather than one tick later.
  const [prevCursor, setPrevCursor] = useState(cursor);
  if (cursor !== prevCursor) {
    setPrevCursor(cursor);
    if (cursor != null) setCurrent(cursor);
  }

  const items = useMemo(
    () => buildItems({ current, total, leadCount, trailCount, windowSize }),
    [current, total, leadCount, trailCount, windowSize],
  );

  /** Display order only — the pagination math above always runs ascending. */
  const displayItems = useMemo(
    () => (order === "descending" ? [...items].reverse() : items),
    [items, order],
  );

  /** Every number matching a highlight rule — the set the tray holds when extracted. */
  const extractedValues = useMemo(() => {
    if (!extracted || highlights.length === 0) return [];
    const out: number[] = [];
    for (let n = 1; n <= total; n++) {
      if (matchesFor(n, highlights).length > 0) out.push(n);
    }
    return order === "descending" ? out.reverse() : out;
  }, [extracted, highlights, total, order]);
  const extractedSet = useMemo(() => new Set(extractedValues), [extractedValues]);

  /** The main row, minus whatever just left for the tray — AnimatePresence
   * animates their departure since they simply stop being in this array. */
  const mainRowItems = useMemo(
    () =>
      extractedSet.size === 0
        ? displayItems
        : displayItems.filter((item) => typeof item !== "number" || !extractedSet.has(item)),
    [displayItems, extractedSet],
  );

  const progress = total > 1 ? (current - 1) / (total - 1) : 0;
  const visualProgress = order === "descending" ? 1 - progress : progress;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const orderedFraction = order === "descending" ? 1 - fraction : fraction;
      setCurrent(Math.round(1 + orderedFraction * (total - 1)));
    },
    [order, total],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      setSettledValue(null);
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      updateFromClientX(event.clientX);
    },
    [dragging, updateFromClientX],
  );

  const endDrag = useCallback(() => {
    setDragging((wasDragging) => {
      if (!wasDragging) return false;
      setSettledValue(current);
      onSettle?.(current);
      return false;
    });
  }, [current, onSettle]);

  const jumpToEllipsis = useCallback(
    (item: EllipsisItem) => {
      if (highlights.length) {
        const hiddenHighlighted = range(item.from, item.to).find((n) => matchesFor(n, highlights).length > 0);
        if (hiddenHighlighted !== undefined) {
          setCurrent(hiddenHighlighted);
          setSettledValue(hiddenHighlighted);
          return;
        }
      }
      const mid = Math.round((item.from + item.to) / 2);
      setCurrent(mid);
      setSettledValue(mid);
    },
    [highlights],
  );

  const caption = dragging
    ? `${"→"} ${current}`
    : settledValue !== null
      ? `Stopped at ${settledValue}`
      : highlights.map((h) => h.label).join(" · ");

  return (
    <div className={cn("flex w-full max-w-3xl flex-col items-center gap-5", className)}>
      <div
        // Never wrap to a second row — a wrapped strip reads as vertical and,
        // on the fixed-height presentation frame, pushes past its bottom
        // edge where the class can no longer see it. Cells shrink to fit via
        // the cqi-based sizing above; overflow-x-auto is the last-resort
        // safety net if they still don't.
        // `w-full` is load-bearing: container-type: inline-size implies size
        // containment on this axis, which means the box can no longer size
        // itself from its own content (it was collapsing to near-nothing
        // when left to shrink-to-fit inside the items-center parent below).
        // Giving it an explicit width from the PARENT is what makes cqi (and
        // the box itself) resolve to something sane.
        className="number-strip-plates flex w-full flex-nowrap items-center justify-center gap-1.5 overflow-x-auto rounded-2xl border-2 border-dashed border-foreground/25 bg-muted/40 px-3 py-2.5"
        style={{ containerType: "inline-size" }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {mainRowItems.map((item, renderIndex) => {
            const separator =
              mode === "factorial" && renderIndex > 0 ? (
                <motion.span
                  key={`sep-${typeof item === "number" ? item : item.key}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm font-semibold text-muted-foreground"
                  aria-hidden
                >
                  ×
                </motion.span>
              ) : null;

            if (typeof item !== "number") {
              // Once extracted, a match isn't "hidden inside the ellipsis" —
              // it has physically left for the tray, so the dot would lie.
              const hiddenRules = extracted
                ? []
                : highlights.filter((rule) => range(item.from, item.to).some((n) => rule.predicate(n)));

              return (
                <FragmentWithSeparator key={item.key} separator={separator}>
                  <motion.button
                    type="button"
                    layout
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={CELL_SPRING}
                    onClick={() => jumpToEllipsis(item)}
                    title={`${item.from}–${item.to}`}
                    className={cn(
                      "number-strip-cell relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-muted-foreground transition-colors hover:bg-foreground/10 sm:h-10 sm:w-10",
                      hiddenRules.length > 0 && "text-primary",
                    )}
                  >
                    {"⋯"}
                    {hiddenRules.length > 0 ? (
                      <span className="absolute -top-0.5 right-0 flex gap-0.5">
                        {hiddenRules.slice(0, 3).map((rule, ruleIndex) => (
                          <motion.span
                            key={rule.id}
                            layout
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              rule.colorClass ? "bg-primary" : DEFAULT_RULE_COLORS[ruleIndex % DEFAULT_RULE_COLORS.length].match(/bg-\S+/)?.[0],
                            )}
                          />
                        ))}
                      </span>
                    ) : null}
                  </motion.button>
                </FragmentWithSeparator>
              );
            }

            const isSettled = settledValue === item;
            const matches = matchesFor(item, highlights);
            const remainder = division ? item % division.divisor : null;
            const isDissolved = division !== null && remainder === 0;
            const isCursor = cursor === item;
            // A static highlight reads as "this matches the rule"; the cursor
            // reads as "the agent is looking at this one right now" — a
            // clearly bigger jump, not just a bigger ring, so the two never
            // get mistaken for each other mid-traversal.
            const cellScale = isCursor ? 1.38 : matches.length > 0 ? 1.12 : 1;

            return (
              <FragmentWithSeparator key={item} separator={separator}>
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: cellScale }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={CELL_SPRING}
                  style={{ zIndex: isCursor ? 10 : undefined }}
                  className="relative flex flex-col items-center"
                >
                  {division && !isDissolved ? (
                    <motion.span
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-0.5 rounded-full bg-foreground/10 px-1.5 text-[10px] font-semibold tabular-nums text-foreground/70"
                    >
                      +{remainder}
                    </motion.span>
                  ) : (
                    <span className="mb-0.5 h-[14px]" />
                  )}

                  <div
                    className={cn(
                      "number-strip-cell flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-[#4C4C4C] text-sm font-medium tabular-nums text-white shadow-[0_6px_16px_rgba(0,0,0,0.24)] transition-colors duration-300 sm:h-10 sm:w-10",
                      matches.length === 1 && colorFor(matches[0], highlights.indexOf(matches[0])),
                      matches.length >= 2 &&
                        "border-transparent text-white ring-2 ring-offset-2 ring-offset-background",
                      isSettled && "ring-2 ring-sky-400 ring-offset-2 ring-offset-background",
                      isDissolved && "text-white/40 line-through decoration-2",
                      // Overrides any highlight ring above — mid-traversal the
                      // cursor is the one thing the eye should follow.
                      isCursor && "ring-4 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                    style={
                      matches.length >= 2
                        ? {
                            background: `linear-gradient(135deg, ${gradientStop(matches[0], highlights.indexOf(matches[0]))} 50%, ${gradientStop(matches[1], highlights.indexOf(matches[1]))} 50%)`,
                          }
                        : undefined
                    }
                  >
                    {item}
                  </div>
                  {matches.length >= 2 ? (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-[8px] font-bold text-background">
                      {matches.length}
                    </span>
                  ) : null}
                </motion.div>
              </FragmentWithSeparator>
            );
          })}
        </AnimatePresence>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        className="relative h-2 w-full max-w-md cursor-grab touch-none rounded-full bg-foreground/10 active:cursor-grabbing"
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/50"
          animate={{ width: `${visualProgress * 100}%` }}
          transition={dragging ? { duration: 0 } : TRACK_SPRING}
        />
        <motion.div
          className={cn(
            "absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow transition-transform",
            dragging && "scale-125",
          )}
          animate={{ left: `calc(${visualProgress * 100}% - 8px)` }}
          transition={dragging ? { duration: 0 } : TRACK_SPRING}
        />
      </div>

      <div className="flex h-4 items-center gap-3">
        <p className="text-xs text-muted-foreground">{caption}</p>
        {division ? (
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/70">
            ÷ {division.divisor}
          </span>
        ) : null}
      </div>

      <AnimatePresence>
        {extracted && extractedValues.length > 0 ? (
          <motion.div
            key="tray"
            layout
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={CELL_SPRING}
            className="flex w-full max-w-2xl flex-col items-center gap-2 rounded-2xl border-2 border-primary/30 bg-primary/5 px-4 py-3"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/80">
              Pulled out{highlights.length ? ` — ${highlights.map((h) => h.label).join(" · ")}` : ""} ({extractedValues.length})
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <AnimatePresence initial={false}>
                {extractedValues.slice(0, MAX_TRAY_CELLS).map((value, index) => {
                  const matches = matchesFor(value, highlights);
                  return (
                    <motion.div
                      key={value}
                      layout
                      initial={{ opacity: 0, y: 10, scale: 0.5 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ ...CELL_SPRING, delay: index * TRAY_STAGGER_S }}
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums text-white shadow-sm sm:h-8 sm:w-8",
                        matches.length >= 1
                          ? colorFor(matches[0], highlights.indexOf(matches[0]))
                          : "border-border bg-[#4C4C4C]",
                      )}
                    >
                      {value}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {extractedValues.length > MAX_TRAY_CELLS ? (
                <span className="text-xs font-medium text-muted-foreground">
                  +{extractedValues.length - MAX_TRAY_CELLS} more
                </span>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {accumulator ? (
          <motion.div
            key="accumulator"
            layout
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={CELL_SPRING}
            className="flex items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur-sm"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {accumulator.label}
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {accumulator.value}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Renders `children` preceded by an optional × separator, without adding a wrapper element to the flex row. */
function FragmentWithSeparator({
  separator,
  children,
}: {
  separator: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      {separator}
      {children}
    </>
  );
}
