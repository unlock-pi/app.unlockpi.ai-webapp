/**
 * Core vocabulary for the Topology agent.
 *
 * Every topology operation — add a device, wire two of them together, drop in
 * a preset layout — returns the SAME shape: a list of `TopologyFrame` beats.
 * A frame is a complete snapshot of the scene at one moment (mirroring how
 * the Arrays agent's `ArrayFrame` works), so the player never has to know
 * which operation produced it.
 */

import type { SceneNode, SceneZone, TopoScene } from "@/features/topologies/lib/topology-kit";

/** One beat of an animation: a full scene snapshot, not a delta. */
export type TopologyFrame = {
  scene: TopoScene;
  /** One short line explaining this beat. */
  note: string;
};

/** What every topology operation hands back to the executor. */
export type TopologyOpResult = {
  scene: TopoScene;
  frames: TopologyFrame[];
  /** Plain-language result for the model to speak. */
  summary: string;
  meta?: Record<string, unknown>;
  /**
   * The operation declined to run (unknown device, duplicate id, at
   * capacity). `scene` is unchanged and `summary` says why — the model
   * should relay the reason rather than retry.
   */
  rejected?: boolean;
};

/**
 * The agent's authoritative view of the world. Tools read and write THIS —
 * never whatever the model happens to remember from the conversation. When
 * the teacher says "connect the router to it", this is what "it" resolves
 * against (the most recently placed or selected device).
 */
export type TopologyAgentState = {
  activeCanvasId: string | null;
  scene: TopoScene;
  /** What preset (if any) the board currently shows — "star", "hybrid_office", etc. */
  presetName: string | null;
  /** Whether packets are currently animating along every connection. */
  packetsAnimating: boolean;
};

/** An empty 8x8 floor with nothing on it — the board's resting state. */
export function emptyScene(): TopoScene {
  return { w: 8, d: 8, zones: [], nodes: [], links: [], selected: null };
}

export function createInitialAgentState(canvasId: string | null = null): TopologyAgentState {
  return {
    activeCanvasId: canvasId,
    scene: emptyScene(),
    presetName: null,
    packetsAnimating: false,
  };
}

/**
 * One-line state description sent back to the model after every tool call.
 *
 * It rides along on EVERY tool result, so it has to be small — repeating a
 * full scene dump on every call would eat the context window the
 * conversation itself needs.
 */
export function describeAgentState(state: TopologyAgentState): string {
  const { scene } = state;
  if (scene.nodes.length === 0) return "No topology on the board.";

  const zoneCount = scene.zones?.length ?? 0;
  const selected = scene.selected ? scene.nodes.find((n) => n.id === scene.selected) : null;

  return (
    `${scene.nodes.length} device(s), ${scene.links.length} link(s)` +
    (zoneCount > 0 ? `, ${zoneCount} zone(s)` : "") +
    (state.presetName ? ` (preset: ${state.presetName})` : "") +
    (selected ? `. Selected: ${selected.label ?? selected.type} (${selected.id}).` : ".")
  );
}

export type { SceneNode, SceneZone, TopoScene };
