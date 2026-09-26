import {
  createInitialAgentState,
  describeAgentState,
  type TopologyAgentState,
  type TopologyOpResult,
} from "@/features/topologies/lib/topology-types";

/** Supporting material shown beside the board, never inside it. */
export type TopologyOverlay =
  | { kind: "explanation"; title: string; content: string }
  | { kind: "legend"; title: string; items: Array<{ label: string; description: string }> }
  | { kind: "quiz"; question: string; answer: string; choices?: string[] };

/**
 * Everything a tool is allowed to do to the world.
 *
 * Tools never touch React state directly — they read `state` and call these.
 * That keeps every tool pure enough to test, and means the same tool set
 * drives the voice agent, a text chat, or a demo page by swapping the context.
 */
export type TopologyToolContext = {
  /** Authoritative state. Tools resolve "the router" or "it" against THIS. */
  readonly state: TopologyAgentState;
  /** Commit an operation: its scene becomes the new truth, its frames animate. */
  play: (result: TopologyOpResult) => void;
  /** Update non-scene state: the selected device, which preset is showing, whether packets are animating. */
  patch: (partial: { selected?: string | null; presetName?: string | null; packetsAnimating?: boolean }) => void;
  /** Show supporting material beside the board. */
  overlay: (overlay: TopologyOverlay) => void;
  /** Clear the selection, keeping the scene. */
  resetCanvas: () => void;
  /** Remove every device, link, and zone. */
  clearCanvas: () => void;
};

/** What every tool returns to the model. */
export type TopologyToolOutcome = {
  ok: boolean;
  summary: string;
  /** One-line snapshot of the board, so the model never has to guess. */
  state: string;
  meta?: Record<string, unknown>;
};

/** Standard way to finish a tool that ran an operation on the scene. */
export function commit(ctx: TopologyToolContext, result: TopologyOpResult): TopologyToolOutcome {
  ctx.play(result);
  return {
    ok: !result.rejected,
    summary: result.summary,
    state: describeAgentState(ctx.state),
    meta: result.meta,
  };
}

/** Finish a tool that changed presentation (selection, overlays, presets) rather than the scene. */
export function report(
  ctx: TopologyToolContext,
  summary: string,
  extra: Partial<TopologyToolOutcome> = {},
): TopologyToolOutcome {
  return { ok: true, summary, state: describeAgentState(ctx.state), ...extra };
}

export function fail(ctx: TopologyToolContext, summary: string): TopologyToolOutcome {
  return { ok: false, summary, state: describeAgentState(ctx.state) };
}

/**
 * A context that does nothing, for when the tool set is built only to read its
 * schemas — the server route that mints the Realtime session needs the
 * parameter definitions but must never execute anything.
 */
export function createSchemaOnlyContext(): TopologyToolContext {
  return {
    state: createInitialAgentState(),
    play: () => {},
    patch: () => {},
    overlay: () => {},
    resetCanvas: () => {},
    clearCanvas: () => {},
  };
}
