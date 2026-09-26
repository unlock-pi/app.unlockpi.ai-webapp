import { components, LINKS, ZONES, type SceneNode, type TopoScene } from "@/features/topologies/lib/topology-kit";
import type { TopologyFrame, TopologyOpResult } from "@/features/topologies/lib/topology-types";

/**
 * Hard caps so a voice command can never blow past what an isometric board
 * can stay legible at. Generous compared to the Arrays agent's 10 cells,
 * because a topology naturally has more nodes than a strip has slots.
 */
export const MAX_COMPONENTS = 30;
export const MAX_CONNECTIONS = 60;
export const MAX_ZONES = 6;

/** Every device id TopoKit can draw, in the same four groups the block-library panel uses. */
export const ALL_DEVICE_TYPES = components.map((c) => c.id) as [string, ...string[]];
export type PlaceableDeviceType = (typeof ALL_DEVICE_TYPES)[number];

export const CONNECTION_KINDS = Object.keys(LINKS) as [keyof typeof LINKS, ...Array<keyof typeof LINKS>];
export const ZONE_KINDS = Object.keys(ZONES) as [keyof typeof ZONES, ...Array<keyof typeof ZONES>];

/** Where to put a device the caller didn't give coordinates for: the first free cell, row by row. */
export function nextOpenPosition(scene: TopoScene): { x: number; y: number } {
  const occupied = new Set(scene.nodes.map((n) => `${Math.round(n.x)},${Math.round(n.y)}`));
  const columns = 8;
  for (let i = 0; i < columns * 20; i++) {
    const x = i % columns;
    const y = Math.floor(i / columns);
    if (!occupied.has(`${x},${y}`)) return { x, y };
  }
  return { x: 0, y: 0 };
}

/** The floor and camera always fit the nodes and zones actually on the board, with a little margin. */
export function fitBounds(nodes: SceneNode[], zones: TopoScene["zones"] = []): { w: number; d: number } {
  const xs = [0, ...nodes.map((n) => n.x), ...(zones ?? []).map((z) => z.x + z.w - 1)];
  const ys = [0, ...nodes.map((n) => n.y), ...(zones ?? []).map((z) => z.y + z.d - 1)];
  return { w: Math.max(6, Math.ceil(Math.max(...xs)) + 2), d: Math.max(6, Math.ceil(Math.max(...ys)) + 2) };
}

/** Recomputes w/d from the scene's own nodes and zones — call after any mutation. */
export function withFitBounds(scene: Omit<TopoScene, "w" | "d">): TopoScene {
  const { w, d } = fitBounds(scene.nodes, scene.zones);
  return { ...scene, w, d };
}

/** Deep-clones a scene so each frame is an independent snapshot the player can seek and replay. */
export function cloneScene(scene: TopoScene): TopoScene {
  return structuredClone(scene);
}

export function frame(scene: TopoScene, note: string): TopologyFrame {
  return { scene: cloneScene(scene), note };
}

/** Finds a node by id or, failing that, by a case-insensitive label match — what "the router" resolves against. */
export function findNode(scene: TopoScene, idOrLabel: string): SceneNode | undefined {
  const byId = scene.nodes.find((n) => n.id === idOrLabel);
  if (byId) return byId;
  const needle = idOrLabel.trim().toLowerCase();
  return scene.nodes.find((n) => (n.label ?? n.type).toLowerCase() === needle);
}

/** Lookup check that reports why, since the model needs to relay it. */
export function nodeError(scene: TopoScene, idOrLabel: string): string | null {
  if (scene.nodes.length === 0) return "There is nothing on the board yet.";
  if (!findNode(scene, idOrLabel)) {
    return `No device matches "${idOrLabel}". Use its id or the label shown on the board.`;
  }
  return null;
}

export function capacityError(
  scene: TopoScene,
  adding: { nodes?: number; links?: number; zones?: number },
): string | null {
  const nextNodes = scene.nodes.length + (adding.nodes ?? 0);
  if (nextNodes > MAX_COMPONENTS) {
    return `That would put ${nextNodes} devices on the board — the limit is ${MAX_COMPONENTS} so the layout stays readable.`;
  }
  const nextLinks = scene.links.length + (adding.links ?? 0);
  if (nextLinks > MAX_CONNECTIONS) {
    return `That would add up to ${nextLinks} links — the limit is ${MAX_CONNECTIONS}.`;
  }
  const nextZones = (scene.zones?.length ?? 0) + (adding.zones ?? 0);
  if (nextZones > MAX_ZONES) {
    return `That would add up to ${nextZones} zones — the limit is ${MAX_ZONES}.`;
  }
  return null;
}

/** A refusal that still renders: the scene is unchanged, one frame explains why. */
export function refuse(scene: TopoScene, summary: string): TopologyOpResult {
  return { scene, frames: [frame(scene, summary)], summary, rejected: true };
}

let idCounter = 0;
/** Stable, readable ids (`router-1`, `link-2`, ...) — unique for one session, which is all a scene graph needs. */
export function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
