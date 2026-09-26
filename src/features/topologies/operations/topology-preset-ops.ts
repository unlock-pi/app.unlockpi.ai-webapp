/**
 * The six ready-made layouts from "TopoKit — Isomer.js topology blocks.html"
 * (its "Topologies" tab), ported node-for-node: same device types, same
 * positions, same link kinds and routing, same zones. Only the ids are
 * generated fresh on each call, since our board persists across many tool
 * calls in one session rather than being rebuilt from scratch per render.
 */

import { createId, frame } from "@/features/topologies/lib/topology-frames";
import type { SceneLink, SceneNode, SceneZone, TopoScene } from "@/features/topologies/lib/topology-kit";
import type { TopologyOpResult } from "@/features/topologies/lib/topology-types";

export const PRESET_NAMES = ["star", "bus", "ring", "mesh", "tree", "hybrid"] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

const PRESET_LABEL: Record<PresetName, string> = {
  star: "Star",
  bus: "Bus",
  ring: "Ring",
  mesh: "Mesh",
  tree: "Tree",
  hybrid: "Hybrid office",
};

export const PRESET_DESCRIPTION: Record<PresetName, string> = {
  star: "Every node has its own cable to one central switch. Easy to add nodes; the switch is the single point of failure.",
  bus: "One shared backbone with a terminator at each end. Every node taps onto it with a short drop cable.",
  ring: "Each node links to exactly two neighbours; traffic travels around the loop in one direction.",
  mesh: "Every router links to every other one, so any single link can fail without splitting the network.",
  tree: "A hierarchy: core router, then distribution switches, then endpoints. Stars nested inside a star.",
  hybrid: "A realistic office: WAN edge, firewall, a DMZ with public servers, and a LAN with wired and Wi-Fi clients.",
};

function star(): TopoScene {
  const sw = createId("switch");
  const specs: Array<{ type: string; x: number; y: number; label: string }> = [
    { type: "desktop", x: 0, y: 3, label: "PC-1" },
    { type: "desktop", x: 6, y: 3, label: "PC-2" },
    { type: "laptop", x: 3, y: 0, label: "Laptop" },
    { type: "printer", x: 3, y: 6, label: "Printer" },
    { type: "server", x: 6, y: 6, label: "File server" },
    { type: "storage", x: 0, y: 0, label: "NAS" },
    { type: "desktop", x: 6, y: 0, label: "PC-3" },
    { type: "iot", x: 0, y: 6, label: "Camera" },
  ];
  const rest: SceneNode[] = specs.map((s) => ({ id: createId(s.type), type: s.type, x: s.x, y: s.y, label: s.label }));
  const nodes: SceneNode[] = [{ id: sw, type: "switch", x: 3, y: 3, label: "Core switch" }, ...rest];
  const links: SceneLink[] = rest.map((n) => ({ a: sw, b: n.id, kind: "ethernet" }));
  const zones: SceneZone[] = [{ x: 0, y: 0, w: 7, d: 7, type: "lan", label: "LAN" }];
  return { w: 7, d: 7, zones, nodes, links };
}

function bus(): TopoScene {
  const t1 = createId("terminator");
  const t2 = createId("terminator");
  const types = ["desktop", "laptop", "printer", "server", "desktop", "storage", "desktop"];
  const positions: Array<[number, number]> = [[1, 1], [7, 2], [1, 3], [7, 4], [1, 5], [7, 6], [1, 7]];

  const nodes: SceneNode[] = [
    { id: t1, type: "terminator", x: 4, y: 0, label: "Terminator" },
    { id: t2, type: "terminator", x: 4, y: 8, label: "Terminator" },
  ];
  const links: SceneLink[] = [{ a: t1, b: t2, kind: "coax" }];

  positions.forEach(([x, y], i) => {
    const id = createId(types[i]);
    nodes.push({ id, type: types[i], x, y, label: `Node ${i + 1}` });
    links.push({ a: id, to: [4.5, y + 0.5], kind: "ethernet" });
  });

  return { w: 9, d: 9, nodes, links };
}

function ring(): TopoScene {
  const positions: Array<[number, number]> = [[1, 1], [3, 0], [5, 1], [6, 3], [5, 5], [3, 6], [1, 5], [0, 3]];
  const types = ["desktop", "server", "laptop", "desktop", "storage", "desktop", "printer", "server"];
  const nodes: SceneNode[] = positions.map(([x, y], i) => ({ id: createId(types[i]), type: types[i], x, y, label: `Node ${i + 1}` }));
  const links: SceneLink[] = nodes.map((n, i) => ({ a: n.id, b: nodes[(i + 1) % nodes.length].id, kind: "fiber" }));
  return { w: 7, d: 7, nodes, links };
}

function mesh(): TopoScene {
  const positions: Array<[number, number]> = [[3, 0], [6, 2], [5, 6], [1, 6], [0, 2]];
  const nodes: SceneNode[] = positions.map(([x, y], i) => ({ id: createId("router"), type: "router", x, y, label: `R${i + 1}` }));
  const links: SceneLink[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) links.push({ a: nodes[i].id, b: nodes[j].id, kind: "fiber" });
  }
  return { w: 7, d: 7, nodes, links };
}

function tree(): TopoScene {
  const root = createId("router");
  const s1 = createId("switch");
  const s2 = createId("switch");
  const a = createId("desktop");
  const b = createId("printer");
  const c = createId("desktop");
  const d = createId("server");

  const nodes: SceneNode[] = [
    { id: root, type: "router", x: 7, y: 7, label: "Core router" },
    { id: s1, type: "switch", x: 7, y: 3, label: "Floor 1 switch" },
    { id: s2, type: "switch", x: 3, y: 7, label: "Floor 2 switch" },
    { id: a, type: "desktop", x: 7, y: 0, label: "PC-1" },
    { id: b, type: "printer", x: 4, y: 3, label: "Printer" },
    { id: c, type: "desktop", x: 0, y: 7, label: "PC-2" },
    { id: d, type: "server", x: 3, y: 4, label: "App server" },
  ];
  const links: SceneLink[] = [
    { a: root, b: s1, kind: "fiber" },
    { a: root, b: s2, kind: "fiber" },
    { a: s1, b: a, kind: "ethernet" },
    { a: s1, b: b, kind: "ethernet" },
    { a: s2, b: c, kind: "ethernet" },
    { a: s2, b: d, kind: "ethernet" },
  ];

  return { w: 9, d: 9, zones: [{ x: 0, y: 0, w: 9, d: 9, type: "lan", label: "LAN" }], nodes, links };
}

function hybrid(): TopoScene {
  const ids = {
    cloud: createId("cloud"),
    modem: createId("modem"),
    fw: createId("firewall"),
    rt: createId("router"),
    sw: createId("switch"),
    pc: createId("desktop"),
    pr: createId("printer"),
    ap: createId("ap"),
    lap: createId("laptop"),
    ph: createId("phone"),
    lb: createId("lb"),
    rack: createId("rack"),
    db: createId("db"),
  };

  const nodes: SceneNode[] = [
    { id: ids.cloud, type: "cloud", x: 9, y: 7, label: "Internet" },
    { id: ids.modem, type: "modem", x: 9, y: 4, label: "ISP modem" },
    { id: ids.fw, type: "firewall", x: 7, y: 4, label: "Firewall" },
    { id: ids.rt, type: "router", x: 5, y: 4, label: "Router" },
    { id: ids.sw, type: "switch", x: 3, y: 4, label: "Switch" },
    { id: ids.pc, type: "desktop", x: 1, y: 4, label: "PC" },
    { id: ids.pr, type: "printer", x: 1, y: 6, label: "Printer" },
    { id: ids.ap, type: "ap", x: 3, y: 1, label: "Wi-Fi AP" },
    { id: ids.lap, type: "laptop", x: 0, y: 1, label: "Laptop" },
    { id: ids.ph, type: "phone", x: 5, y: 0, label: "Phone" },
    { id: ids.lb, type: "lb", x: 7, y: 8, label: "Load balancer" },
    { id: ids.rack, type: "rack", x: 5, y: 8, label: "Web servers" },
    { id: ids.db, type: "db", x: 3, y: 8, label: "Database" },
  ];
  const links: SceneLink[] = [
    { a: ids.cloud, b: ids.modem, kind: "wan" },
    { a: ids.modem, b: ids.fw, kind: "fiber" },
    { a: ids.fw, b: ids.rt, kind: "ethernet" },
    { a: ids.rt, b: ids.sw, kind: "ethernet" },
    { a: ids.sw, b: ids.pc, kind: "ethernet" },
    { a: ids.sw, b: ids.pr, kind: "ethernet", route: "yx" },
    { a: ids.sw, b: ids.ap, kind: "ethernet" },
    { a: ids.ap, b: ids.lap, kind: "wireless" },
    { a: ids.ap, b: ids.ph, kind: "wireless" },
    { a: ids.fw, b: ids.lb, kind: "ethernet" },
    { a: ids.lb, b: ids.rack, kind: "ethernet" },
    { a: ids.rack, b: ids.db, kind: "ethernet" },
  ];
  const zones: SceneZone[] = [
    { x: 0, y: 0, w: 7, d: 7, type: "lan", label: "LAN" },
    { x: 2, y: 7, w: 7, d: 3, type: "dmz", label: "DMZ" },
    { x: 9, y: 2, w: 2, d: 7, type: "wan", label: "WAN" },
  ];

  return { w: 11, d: 10, zones, nodes, links };
}

const BUILDERS: Record<PresetName, () => TopoScene> = { star, bus, ring, mesh, tree, hybrid };

/** Swaps the whole board for one of TopoKit's six worked examples. */
export function applyPreset(preset: PresetName): TopologyOpResult {
  const scene = BUILDERS[preset]();
  const label = PRESET_LABEL[preset];

  return {
    scene,
    frames: [frame(scene, `Built the ${label} topology. ${PRESET_DESCRIPTION[preset]}`)],
    summary: `Replaced the board with the ${label} topology (${scene.nodes.length} device(s), ${scene.links.length} link(s)).`,
    meta: { preset },
  };
}
