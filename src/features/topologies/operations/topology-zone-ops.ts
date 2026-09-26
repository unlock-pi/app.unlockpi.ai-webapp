import type { SceneZone, TopoScene, ZoneKind } from "@/features/topologies/lib/topology-kit";
import { capacityError, frame, refuse, withFitBounds } from "@/features/topologies/lib/topology-frames";
import type { TopologyOpResult } from "@/features/topologies/lib/topology-types";

/** TopoKit zones carry no id — they're addressed by their label, same as a device by its label. */
function findZone(scene: TopoScene, label: string): SceneZone | undefined {
  const needle = label.trim().toLowerCase();
  return (scene.zones ?? []).find((z) => (z.label ?? z.type).toLowerCase() === needle);
}

export function addZone(
  scene: TopoScene,
  input: { type: ZoneKind; x: number; y: number; w: number; d: number; label?: string },
): TopologyOpResult {
  const capError = capacityError(scene, { zones: 1 });
  if (capError) return refuse(scene, capError);
  if (input.w <= 0 || input.d <= 0) return refuse(scene, "A zone needs a positive width and depth.");

  const label = input.label ?? input.type.toUpperCase();
  const zone: SceneZone = { x: input.x, y: input.y, w: input.w, d: input.d, type: input.type, label };
  const next = withFitBounds({ ...scene, zones: [...(scene.zones ?? []), zone] });

  return {
    scene: next,
    frames: [frame(next, `Marked out the ${label} zone.`)],
    summary: `Added a ${input.type.toUpperCase()} zone labelled "${label}".`,
  };
}

export function removeZone(scene: TopoScene, input: { label: string }): TopologyOpResult {
  const zone = findZone(scene, input.label);
  if (!zone) return refuse(scene, `No zone matches "${input.label}".`);

  const next: TopoScene = { ...scene, zones: (scene.zones ?? []).filter((z) => z !== zone) };

  return {
    scene: next,
    frames: [frame(next, `Removed the ${zone.label} zone.`)],
    summary: `Removed the ${zone.label} zone. The devices inside it are untouched.`,
  };
}

export function resizeZone(
  scene: TopoScene,
  input: { label: string; x?: number; y?: number; w?: number; d?: number; newLabel?: string },
): TopologyOpResult {
  const zone = findZone(scene, input.label);
  if (!zone) return refuse(scene, `No zone matches "${input.label}".`);

  const updated: SceneZone = {
    ...zone,
    x: input.x ?? zone.x,
    y: input.y ?? zone.y,
    w: input.w ?? zone.w,
    d: input.d ?? zone.d,
    label: input.newLabel ?? zone.label,
  };
  const next = withFitBounds({ ...scene, zones: (scene.zones ?? []).map((z) => (z === zone ? updated : z)) });

  return {
    scene: next,
    frames: [frame(next, `Resized the ${updated.label} zone.`)],
    summary: `Updated the ${updated.label} zone.`,
  };
}
