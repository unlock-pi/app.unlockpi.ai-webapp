import { LINKS } from "@/features/topologies/lib/topology-kit";
import type { LinkKind, SceneLink, TopoScene } from "@/features/topologies/lib/topology-kit";
import { capacityError, findNode, frame, nodeError, refuse } from "@/features/topologies/lib/topology-frames";
import type { TopologyOpResult } from "@/features/topologies/lib/topology-types";

const KIND_LABEL: Record<LinkKind, string> = Object.fromEntries(
  (Object.keys(LINKS) as LinkKind[]).map((k) => [k, LINKS[k].name]),
) as Record<LinkKind, string>;

function linkBetween(scene: TopoScene, aId: string, bId: string): SceneLink | undefined {
  return scene.links.find((l) => (l.a === aId && l.b === bId) || (l.a === bId && l.b === aId));
}

export function connectDevices(
  scene: TopoScene,
  input: { a: string; b: string; kind: LinkKind; label?: string },
): TopologyOpResult {
  const errorA = nodeError(scene, input.a);
  if (errorA) return refuse(scene, errorA);
  const errorB = nodeError(scene, input.b);
  if (errorB) return refuse(scene, errorB);

  const a = findNode(scene, input.a)!;
  const b = findNode(scene, input.b)!;
  if (a.id === b.id) return refuse(scene, "A device cannot be connected to itself.");
  if (linkBetween(scene, a.id, b.id)) {
    return refuse(scene, `${a.label ?? a.type} and ${b.label ?? b.type} are already connected.`);
  }
  const capError = capacityError(scene, { links: 1 });
  if (capError) return refuse(scene, capError);

  const link: SceneLink = { a: a.id, b: b.id, kind: input.kind, label: input.label };
  const next: TopoScene = { ...scene, links: [...scene.links, link], selected: a.id };

  return {
    scene: next,
    frames: [frame(next, `Wired ${a.label ?? a.type} to ${b.label ?? b.type} with ${KIND_LABEL[input.kind]}.`)],
    summary: `Connected ${a.label ?? a.type} and ${b.label ?? b.type} with ${KIND_LABEL[input.kind]}.`,
  };
}

export function disconnectDevices(scene: TopoScene, input: { a: string; b: string }): TopologyOpResult {
  const errorA = nodeError(scene, input.a);
  if (errorA) return refuse(scene, errorA);
  const errorB = nodeError(scene, input.b);
  if (errorB) return refuse(scene, errorB);

  const a = findNode(scene, input.a)!;
  const b = findNode(scene, input.b)!;
  const existing = linkBetween(scene, a.id, b.id);
  if (!existing) return refuse(scene, `${a.label ?? a.type} and ${b.label ?? b.type} are not connected.`);

  const next: TopoScene = { ...scene, links: scene.links.filter((l) => l !== existing) };

  return {
    scene: next,
    frames: [frame(next, `Removed the link between ${a.label ?? a.type} and ${b.label ?? b.type}.`)],
    summary: `Disconnected ${a.label ?? a.type} from ${b.label ?? b.type}.`,
  };
}
