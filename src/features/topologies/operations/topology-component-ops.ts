import { byId } from "@/features/topologies/lib/topology-kit";
import type { SceneNode, TopoScene } from "@/features/topologies/lib/topology-kit";
import {
  capacityError,
  createId,
  findNode,
  frame,
  nextOpenPosition,
  nodeError,
  refuse,
  withFitBounds,
  type PlaceableDeviceType,
} from "@/features/topologies/lib/topology-frames";
import type { TopologyOpResult } from "@/features/topologies/lib/topology-types";

export function addDevice(
  scene: TopoScene,
  input: { type: PlaceableDeviceType; label?: string; x?: number; y?: number },
): TopologyOpResult {
  const capError = capacityError(scene, { nodes: 1 });
  if (capError) return refuse(scene, capError);
  const def = byId[input.type];
  if (!def) return refuse(scene, `"${input.type}" is not a device this board can draw.`);

  const position = input.x !== undefined && input.y !== undefined ? { x: input.x, y: input.y } : nextOpenPosition(scene);
  const node: SceneNode = { id: createId(input.type), type: input.type, x: position.x, y: position.y, label: input.label ?? def.name };
  const next = withFitBounds({ ...scene, nodes: [...scene.nodes, node], selected: node.id });

  return {
    scene: next,
    frames: [frame(next, `Placed ${node.label} at (${position.x}, ${position.y}).`)],
    summary: `Added ${node.label} (${def.name}) to the board.`,
    meta: { nodeId: node.id, x: position.x, y: position.y },
  };
}

export function removeDevice(scene: TopoScene, input: { id: string }): TopologyOpResult {
  const error = nodeError(scene, input.id);
  if (error) return refuse(scene, error);
  const target = findNode(scene, input.id)!;

  const next = withFitBounds({
    ...scene,
    nodes: scene.nodes.filter((n) => n.id !== target.id),
    links: scene.links.filter((l) => l.a !== target.id && l.b !== target.id),
    selected: scene.selected === target.id ? null : scene.selected,
  });

  return {
    scene: next,
    frames: [frame(next, `Removed ${target.label ?? target.type}.`)],
    summary: `Removed ${target.label ?? target.type} and any links to it.`,
  };
}

export function moveDevice(scene: TopoScene, input: { id: string; x: number; y: number }): TopologyOpResult {
  const error = nodeError(scene, input.id);
  if (error) return refuse(scene, error);
  const target = findNode(scene, input.id)!;

  const next = withFitBounds({
    ...scene,
    nodes: scene.nodes.map((n) => (n.id === target.id ? { ...n, x: input.x, y: input.y } : n)),
    selected: target.id,
  });

  return {
    scene: next,
    frames: [frame(next, `Moved ${target.label ?? target.type} to (${input.x}, ${input.y}).`)],
    summary: `Moved ${target.label ?? target.type} to (${input.x}, ${input.y}).`,
  };
}

export function renameDevice(scene: TopoScene, input: { id: string; label: string }): TopologyOpResult {
  const error = nodeError(scene, input.id);
  if (error) return refuse(scene, error);
  const target = findNode(scene, input.id)!;
  const previous = target.label ?? target.type;

  const next = withFitBounds({
    ...scene,
    nodes: scene.nodes.map((n) => (n.id === target.id ? { ...n, label: input.label } : n)),
    selected: target.id,
  });

  return {
    scene: next,
    frames: [frame(next, `Renamed ${previous} to ${input.label}.`)],
    summary: `Renamed ${previous} to ${input.label}.`,
  };
}

export type DeviceStatus = "idle" | "active" | "error" | "offline";
const STATUS_SUFFIX = / \((?:active|error|offline)\)$/i;

/**
 * TopoKit's blocks have no built-in status coloring, so a status is shown the
 * same way a teacher would mark one up on a whiteboard: as a plain suffix on
 * the label, e.g. "Router (offline)".
 */
export function setDeviceStatus(scene: TopoScene, input: { id: string; status: DeviceStatus }): TopologyOpResult {
  const error = nodeError(scene, input.id);
  if (error) return refuse(scene, error);
  const target = findNode(scene, input.id)!;
  const base = (target.label ?? target.type).replace(STATUS_SUFFIX, "");
  const label = input.status === "idle" ? base : `${base} (${input.status})`;

  const next = withFitBounds({
    ...scene,
    nodes: scene.nodes.map((n) => (n.id === target.id ? { ...n, label } : n)),
    selected: target.id,
  });

  return {
    scene: next,
    frames: [frame(next, `${base} is now ${input.status}.`)],
    summary: `Marked ${base} as ${input.status}.`,
  };
}
