/**
 * Core vocabulary for the Counting agent.
 *
 * Mirrors `array-types.ts`: every counting operation returns the SAME shape —
 * a list of `CountingFrame` beats, each a full snapshot of the strip. Most
 * counting operations are a single declarative change (set the total,
 * highlight multiples of 5, divide by 7) rather than a many-step animation,
 * so most results carry exactly one frame — but the shape stays the same as
 * the arrays agent so the same player and tool-context machinery works.
 */

export type Order = "ascending" | "descending";
export type Mode = "list" | "factorial";
/** "strip" is the horizontal pagination strip; "grid" is rows-and-columns, paginated in fixed blocks. */
export type View = "strip" | "grid";
/** Numbers per grid page — "the next hundred". */
export const GRID_BLOCK_SIZE = 100;

/** How an operation plays out. See `array-types.ts` for the rationale. */
export type AnimationSpeed = "instant" | "normal" | "slow";

/** A single "highlight multiples of N" rule, serializable for structuredClone. */
export type HighlightRule = {
  id: string;
  label: string;
  /** Multiples of this number are highlighted. The predicate is derived at render time. */
  of: number;
};

export type Division = { divisor: number } | null;

/**
 * A running result shown beside the strip — a factorial's product building up,
 * or a list of collected matches. Stays on screen after the traversal that
 * produced it ends, until `clear_result` dismisses it, which is the whole
 * point: the teacher asked to SEE the product, not just hear it spoken.
 */
export type Accumulator = { label: string; value: string } | null;

/**
 * One beat of the strip: a full snapshot, not a delta — same reasoning as
 * `ArrayFrame`. Lets the player seek, pause, and resume anywhere.
 */
export type CountingFrame = {
  total: number;
  order: Order;
  mode: Mode;
  highlights: HighlightRule[];
  division: Division;
  /**
   * The number a traversal is visiting RIGHT NOW — rendered bigger and with a
   * distinct ring from a plain highlight, so "matches the rule" and "the
   * agent is looking at this one" read as different intensities. `null`
   * between traversals.
   */
  cursor?: number | null;
  accumulator?: Accumulator;
  /**
   * When true, every number matching a highlight rule is pulled out of the
   * main row and shown in its own tray below — "bring out the highlighted
   * elements". The main row animates them leaving; the tray animates them
   * landing, so the split itself is a motion, not a snap.
   */
  extracted?: boolean;
  /** How the numbers are laid out. Defaults to "strip". */
  view?: View;
  /** Which block of GRID_BLOCK_SIZE numbers is showing, 0-indexed. Only meaningful when view is "grid". */
  gridPage?: number;
  /** One short line explaining this beat. */
  note: string;
};

/** What every counting tool hands back to the executor. */
export type CountingOpResult = {
  frames: CountingFrame[];
  /** Plain-language result for the model to speak. */
  summary: string;
  meta?: Record<string, unknown>;
  /** The operation declined to run — `frames` describes why, nothing changed. */
  rejected?: boolean;
};

// ── Agent state ────────────────────────────────────────────────────────

/**
 * The agent's authoritative view of the world. Tools read and write THIS —
 * never whatever the model happens to remember from the conversation.
 */
export type CountingAgentState = {
  activeCanvasId: string | null;
  activeFrameId: string | null;
  strip: {
    /** Canvas block id, null until a block exists. */
    id: string | null;
    total: number;
    order: Order;
    mode: Mode;
    highlights: HighlightRule[];
    division: Division;
    cursor: number | null;
    accumulator: Accumulator;
    extracted: boolean;
    view: View;
    gridPage: number;
  };
  teaching: {
    topic: string | null;
    speed: AnimationSpeed;
  };
};

export const DEFAULT_TOTAL = 100;

export function createInitialAgentState(
  canvasId: string | null = null,
): CountingAgentState {
  return {
    activeCanvasId: canvasId,
    activeFrameId: null,
    strip: {
      id: null,
      total: DEFAULT_TOTAL,
      order: "ascending",
      mode: "list",
      highlights: [],
      division: null,
      cursor: null,
      accumulator: null,
      extracted: false,
      view: "strip",
      gridPage: 0,
    },
    teaching: { topic: null, speed: "normal" },
  };
}

/**
 * One-line state description sent back to the model after every tool call.
 * Mirrors `describeAgentState` in `array-types.ts` — small, since it rides
 * along on every tool result.
 */
export function describeAgentState(state: CountingAgentState): string {
  const { strip } = state;
  if (strip.total === 0) return "No number strip on the board.";

  const order = strip.order === "descending" ? "descending" : "ascending";
  const mode = strip.mode === "factorial" ? " as a factorial" : "";
  const highlights = strip.highlights.length
    ? `; highlighting multiples of ${strip.highlights.map((h) => h.of).join(", ")}`
    : "";
  const division = strip.division ? `; divided by ${strip.division.divisor}` : "";
  const result = strip.accumulator ? `; showing ${strip.accumulator.label} ${strip.accumulator.value}` : "";
  const view =
    strip.view === "grid"
      ? `; shown as a grid, block ${strip.gridPage + 1} of ${Math.max(1, Math.ceil(strip.total / GRID_BLOCK_SIZE))}`
      : "";

  return `Strip 1..${strip.total} (${order}${mode})${highlights}${division}${result}${view}`;
}
