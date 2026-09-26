/**
 * TopoKit — a direct TypeScript port of the block library from
 * "TopoKit — Isomer.js topology blocks.html".
 *
 * This is deliberately a faithful port, not a reinterpretation: the palette,
 * the five geometry helpers, and every device's exact part list and numbers
 * are copied from the reference file so the board looks like that file's
 * blocks, not like a different device library that happens to cover the same
 * names. See that HTML file's "five rules" panel for the coordinate
 * conventions this assumes:
 *   1. One cell, one origin — a block draws inside x, y ∈ [0, 1] from its
 *      cell's corner.
 *   2. Front is −x — screens, ports and LEDs go on that face.
 *   3. Far first — Isomer only sorts faces inside one Shape; across objects,
 *      sort by x + y, largest first (see `renderScene` below).
 *   4. Layers: floor → zones → cables → objects (sorted) → labels on top.
 *   5. Decals float 0.004 off their face (`EPS`) so they never z-fight.
 */

import Isomer, { Color, Path, Point, Shape } from "isomer";

const EPS = 0.004; // lifts decals off a face so they never z-fight

// ---------------------------------------------------------------------------
// 1. Palette
// ---------------------------------------------------------------------------

function col(hex: string, a?: number): Color {
  const n = parseInt(hex.slice(1), 16);
  return new Color((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
}

export const HEX = {
  chassis: "#374150",
  chassisLight: "#566274",
  bay: "#46515F",
  shell: "#D5DBE2",
  white: "#F4F6F8",
  screen: "#2E78D8",
  port: "#1B2029",
  ledOk: "#27CF76",
  ledWarn: "#FFB020",
  router: "#2F6FDB",
  routerTop: "#5A90EA",
  switchC: "#0F9E95",
  switchTop: "#3DBDB4",
  hub: "#7E8896",
  brick: "#C9492B",
  lb: "#E08A00",
  db: "#7657F2",
  dbTop: "#9C86F7",
  cloud: "#D3E1F3",
  person: "#34506E",
  skin: "#E3B48D",
  shadow: "#1B2029",
  packet: "#FFB020",
  ethernet: "#2E78D8",
  fiber: "#F08A24",
  wan: "#8B5CF6",
  wireless: "#0F9E95",
  coax: "#566274",
} as const;

export const C: Record<keyof typeof HEX, Color> = Object.fromEntries(
  (Object.keys(HEX) as Array<keyof typeof HEX>).map((k) => [k, col(HEX[k])]),
) as Record<keyof typeof HEX, Color>;

// ---------------------------------------------------------------------------
// 2. Geometry helpers — all coordinates local to a cell's origin `o`
// ---------------------------------------------------------------------------

export type Origin = { x: number; y: number; z: number };

function box(o: Origin, x: number, y: number, z: number, dx: number, dy: number, dz: number): Shape {
  return Shape.Prism(new Point(o.x + x, o.y + y, o.z + z), dx, dy, dz);
}

function cyl(o: Origin, cx: number, cy: number, z: number, r: number, h: number, v?: number): Shape {
  return Shape.Cylinder(new Point(o.x + cx, o.y + cy, o.z + z), r, v || 28, h);
}

/** A decal on the front (−x) face of a box whose front plane is at local x. */
function front(o: Origin, x: number, y0: number, y1: number, z0: number, z1: number): Path {
  const xx = o.x + x - EPS;
  return new Path([
    new Point(xx, o.y + y0, o.z + z0),
    new Point(xx, o.y + y0, o.z + z1),
    new Point(xx, o.y + y1, o.z + z1),
    new Point(xx, o.y + y1, o.z + z0),
  ]);
}

/** A decal on a horizontal surface at local height z. */
function top(o: Origin, z: number, x0: number, x1: number, y0: number, y1: number): Path {
  const zz = o.z + z + EPS;
  return new Path([
    new Point(o.x + x0, o.y + y0, zz),
    new Point(o.x + x1, o.y + y0, zz),
    new Point(o.x + x1, o.y + y1, zz),
    new Point(o.x + x0, o.y + y1, zz),
  ]);
}

function disc(o: Origin, cx: number, cy: number, z: number, r: number, v?: number): Path {
  return Path.Circle(new Point(o.x + cx, o.y + cy, o.z + z + EPS), r, v || 28);
}

/** A flat polygon on a horizontal surface; flips winding so the normal faces up. */
function poly(o: Origin, z: number, pts: number[][]): Path {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  const ordered = a < 0 ? [...pts].reverse() : pts;
  return new Path(ordered.map((p) => new Point(o.x + p[0], o.y + p[1], o.z + z + EPS)));
}

function arrow(x0: number, y0: number, x1: number, y1: number, w: number, head: number): number[][] {
  const L = Math.hypot(x1 - x0, y1 - y0);
  const dx = (x1 - x0) / L;
  const dy = (y1 - y0) / L;
  const nx = -dy;
  const ny = dx;
  const sx = x1 - dx * head;
  const sy = y1 - dy * head;
  const h = w / 2;
  return [
    [x1, y1],
    [sx - nx * h * 3, sy - ny * h * 3],
    [sx - nx * h, sy - ny * h],
    [x0 - nx * h, y0 - ny * h],
    [x0 + nx * h, y0 + ny * h],
    [sx + nx * h, sy + ny * h],
    [sx + nx * h * 3, sy + ny * h * 3],
  ];
}

function led(o: Origin, x: number, y: number, z: number, s: number): Path {
  return front(o, x, y, y + s, z, z + s);
}

/** Shared by Switch and Hub — a 1U rack strip with `n` ports and link LEDs. */
function rackUnit(iso: Isomer, o: Origin, n: number, body: Color, stripe: Color): void {
  const w = n === 8 ? 0.96 : 0.6;
  const y0 = (1 - w) / 2;
  const pitch = (w - 0.1) / n;
  iso.add(box(o, 0.26, y0, 0, 0.48, w, 0.14), body);
  iso.add(top(o, 0.14, 0.32, 0.68, y0 + 0.05, y0 + w - 0.05), stripe);
  for (let i = 0; i < n; i++) {
    const y = y0 + 0.06 + i * pitch;
    iso.add(front(o, 0.26, y, y + pitch * 0.7, 0.025, 0.08), C.port);
    iso.add(front(o, 0.26, y + pitch * 0.2, y + pitch * 0.4, 0.095, 0.115), i === 2 ? C.ledWarn : C.ledOk);
  }
}

// ---------------------------------------------------------------------------
// 3. Components — id, name, group, h (height for labels), role, parts, draw
// ---------------------------------------------------------------------------

export const DEVICE_GROUPS = ["Endpoints", "Network", "Compute & data", "Scene & links"] as const;
export type DeviceGroup = (typeof DEVICE_GROUPS)[number];

export type TopoComponentDef = {
  id: string;
  name: string;
  group: DeviceGroup;
  /** Height used to float a label above the device. */
  h: number;
  role: string;
  /** Anatomy, shown in the block-library inspector. */
  parts: string[];
  draw: (iso: Isomer, o: Origin) => void;
};

export const components: TopoComponentDef[] = [
  // ---- Endpoints
  {
    id: "desktop",
    name: "Desktop PC",
    group: "Endpoints",
    h: 0.72,
    role: 'Wired end-user workstation. The default "computer" node.',
    parts: [
      "Prism base 0.30×0.36×0.03 + neck 0.05×0.08×0.24 (monitor stand)",
      "Prism panel 0.07×0.68×0.46 with a screen decal on its front face",
      "Prism tower 0.52×0.20×0.66 with drive-slot and power-LED decals",
      "Prism keyboard 0.20×0.52×0.025 + key-area decal, prism mouse",
    ],
    draw(iso, o) {
      iso.add(box(o, 0.46, 0.46, 0, 0.3, 0.36, 0.03), C.chassis); // stand base
      iso.add(box(o, 0.62, 0.6, 0.03, 0.05, 0.08, 0.24), C.chassisLight); // neck
      iso.add(box(o, 0.54, 0.28, 0.2, 0.07, 0.68, 0.46), C.chassis); // panel
      iso.add(front(o, 0.54, 0.32, 0.92, 0.24, 0.62), C.screen); // screen
      iso.add(box(o, 0.3, 0.04, 0, 0.52, 0.2, 0.66), C.chassisLight); // tower
      iso.add(front(o, 0.3, 0.08, 0.2, 0.5, 0.54), C.port); // drive slot
      iso.add(led(o, 0.3, 0.125, 0.58, 0.03), C.ledOk); // power LED
      iso.add(box(o, 0.1, 0.36, 0, 0.2, 0.52, 0.025), C.shell); // keyboard
      iso.add(top(o, 0.025, 0.12, 0.28, 0.38, 0.86), C.white); // keys
      iso.add(box(o, 0.14, 0.26, 0, 0.08, 0.06, 0.025), C.shell); // mouse
    },
  },
  {
    id: "laptop",
    name: "Laptop",
    group: "Endpoints",
    h: 0.47,
    role: "Portable endpoint; usually joins over Wi-Fi.",
    parts: [
      "Prism lid 0.04×0.68×0.44 standing at the back edge, screen decal on front",
      "Prism base 0.52×0.68×0.03 with keyboard and trackpad decals on top",
    ],
    draw(iso, o) {
      iso.add(box(o, 0.7, 0.16, 0.03, 0.04, 0.68, 0.44), C.chassis); // lid
      iso.add(front(o, 0.7, 0.2, 0.8, 0.07, 0.43), C.screen); // screen
      iso.add(box(o, 0.18, 0.16, 0, 0.52, 0.68, 0.03), C.shell); // base
      iso.add(top(o, 0.03, 0.36, 0.64, 0.22, 0.78), C.chassisLight); // keyboard
      iso.add(top(o, 0.03, 0.22, 0.31, 0.38, 0.62), C.white); // trackpad
    },
  },
  {
    id: "phone",
    name: "Phone / tablet",
    group: "Endpoints",
    h: 0.62,
    role: "Mobile client. Pair it with an access point via a wireless link.",
    parts: ["Thin prism dock 0.30×0.40×0.015", "Prism body 0.05×0.32×0.60, screen decal on front"],
    draw(iso, o) {
      iso.add(box(o, 0.3, 0.3, 0, 0.3, 0.4, 0.015), C.chassisLight); // dock
      iso.add(box(o, 0.44, 0.34, 0.015, 0.05, 0.32, 0.6), C.chassis); // body
      iso.add(front(o, 0.44, 0.37, 0.63, 0.07, 0.57), C.screen); // screen
    },
  },
  {
    id: "printer",
    name: "Printer",
    group: "Endpoints",
    h: 0.46,
    role: "Shared network peripheral.",
    parts: [
      "Prism body 0.66×0.72×0.30",
      "Prism paper stack on top",
      "Front output-slot decal + paper sheet prism",
      "Control-panel decal on top",
    ],
    draw(iso, o) {
      iso.add(box(o, 0.16, 0.14, 0, 0.66, 0.72, 0.3), C.shell); // body
      iso.add(box(o, 0.46, 0.26, 0.3, 0.28, 0.48, 0.14), C.white); // paper stack
      iso.add(top(o, 0.3, 0.2, 0.36, 0.58, 0.8), C.chassis); // control panel
      iso.add(front(o, 0.16, 0.24, 0.76, 0.12, 0.17), C.port); // output slot
      iso.add(box(o, 0.06, 0.3, 0.1, 0.1, 0.4, 0.012), C.white); // printed sheet
    },
  },
  {
    id: "iot",
    name: "IoT sensor",
    group: "Endpoints",
    h: 0.52,
    role: "Low-power device: camera, sensor, smart plug.",
    parts: ["Cylinder base r0.20 h0.10", "Thin prism antenna h0.40", "Cylinder dome r0.12 h0.06"],
    draw(iso, o) {
      iso.add(cyl(o, 0.5, 0.5, 0, 0.2, 0.1), C.shell); // base
      iso.add(box(o, 0.6, 0.56, 0.1, 0.03, 0.03, 0.4), C.chassis); // antenna
      iso.add(cyl(o, 0.5, 0.5, 0.1, 0.12, 0.06), C.router); // dome
    },
  },
  {
    id: "user",
    name: "User",
    group: "Endpoints",
    h: 0.78,
    role: "A human actor, for showing who uses which node.",
    parts: ["Cylinder body r0.16 h0.44", "Cylinder head r0.10 h0.16"],
    draw(iso, o) {
      iso.add(cyl(o, 0.5, 0.5, 0, 0.16, 0.44), C.person);
      iso.add(cyl(o, 0.5, 0.5, 0.48, 0.1, 0.16), C.skin);
    },
  },

  // ---- Network
  {
    id: "router",
    name: "Router",
    group: "Network",
    h: 0.66,
    role: "Moves traffic between networks (LAN ↔ WAN). Usually the gateway.",
    parts: [
      "Prism body 0.72×0.76×0.18",
      "Top stripe decal",
      "Two thin prism antennas 0.04×0.04×0.45 at the back",
      "Four LED decals on the front",
    ],
    draw(iso, o) {
      iso.add(box(o, 0.14, 0.12, 0, 0.72, 0.76, 0.18), C.router);
      iso.add(top(o, 0.18, 0.2, 0.8, 0.18, 0.82), C.routerTop);
      for (let i = 0; i < 4; i++) iso.add(led(o, 0.14, 0.3 + i * 0.12, 0.08, 0.05), i === 3 ? C.ledWarn : C.ledOk);
      iso.add(box(o, 0.76, 0.78, 0.18, 0.04, 0.04, 0.45), C.chassis); // far antenna
      iso.add(box(o, 0.76, 0.18, 0.18, 0.04, 0.04, 0.45), C.chassis); // near antenna
    },
  },
  {
    id: "switch",
    name: "Switch",
    group: "Network",
    h: 0.16,
    role: "Connects devices inside one LAN. Center of a star.",
    parts: ["Flat prism 0.48×0.96×0.14 (1U)", "8 port decals along the front", "One link LED above each port"],
    draw(iso, o) {
      rackUnit(iso, o, 8, C.switchC, C.switchTop);
    },
  },
  {
    id: "hub",
    name: "Hub",
    group: "Network",
    h: 0.16,
    role: "Legacy repeater: same shape as a switch, fewer ports, neutral color.",
    parts: ["Flat prism 0.48×0.60×0.14", "4 port decals + LEDs"],
    draw(iso, o) {
      rackUnit(iso, o, 4, C.hub, C.shell);
    },
  },
  {
    id: "modem",
    name: "Modem / ONT",
    group: "Network",
    h: 0.56,
    role: "Converts the ISP line (fiber, DSL, cable) to Ethernet.",
    parts: ["Upright prism 0.24×0.48×0.55", "Vertical column of 4 LED decals", "Vent decals on top"],
    draw(iso, o) {
      iso.add(box(o, 0.38, 0.26, 0, 0.24, 0.48, 0.55), C.white);
      const s = [C.ledOk, C.ledOk, C.ledWarn, C.ledOk];
      for (let i = 0; i < 4; i++) iso.add(led(o, 0.38, 0.475, 0.14 + i * 0.1, 0.05), s[i]);
      for (let j = 0; j < 3; j++) iso.add(top(o, 0.55, 0.44, 0.56, 0.32 + j * 0.12, 0.36 + j * 0.12), C.shell);
    },
  },
  {
    id: "ap",
    name: "Access point",
    group: "Network",
    h: 0.9,
    role: "Bridges wireless clients onto the wired LAN.",
    parts: ["Cylinder puck r0.34 h0.08", "Ring + status dot decals on top", "Three translucent discs above it for the signal"],
    draw(iso, o) {
      iso.add(cyl(o, 0.5, 0.5, 0, 0.34, 0.08, 32), C.white);
      iso.add(disc(o, 0.5, 0.5, 0.08, 0.15), C.router);
      iso.add(disc(o, 0.5, 0.5, 0.085, 0.05), C.ledOk);
      ([[0.32, 0.2], [0.56, 0.3], [0.8, 0.4]] as const).forEach(([r, radius]) => {
        iso.add(disc(o, 0.5, 0.5, r, radius, 32), col(HEX.wireless, 0.2));
      });
    },
  },
  {
    id: "firewall",
    name: "Firewall",
    group: "Network",
    h: 0.86,
    role: "Filters traffic at a trust boundary. Sits between zones.",
    parts: [
      "4 rows of prism bricks 0.28×0.28×0.20",
      "Alternate rows offset by half a brick",
      "Rows drawn bottom-up, bricks far-to-near",
    ],
    draw(iso, o) {
      const bh = 0.2;
      const gap = 0.02;
      const bl = 0.28;
      for (let r = 0; r < 4; r++) {
        const z = r * (bh + gap);
        const start = r % 2 ? 0.06 - 0.15 : 0.06;
        const segs: number[][] = [];
        for (let y = start; y < 0.94; y += bl + gap) {
          const y0 = Math.max(y, 0.06);
          const y1 = Math.min(y + bl, 0.94);
          if (y1 - y0 > 0.05) segs.push([y0, y1]);
        }
        [...segs].reverse().forEach((s) => iso.add(box(o, 0.36, s[0], z, 0.28, s[1] - s[0], bh), C.brick));
      }
    },
  },
  {
    id: "lb",
    name: "Load balancer",
    group: "Network",
    h: 0.26,
    role: "Spreads incoming requests across a pool of servers.",
    parts: ["Prism body 0.72×0.72×0.24", "Three flat arrow polygons on top fanning out from one point"],
    draw(iso, o) {
      iso.add(box(o, 0.14, 0.14, 0, 0.72, 0.72, 0.24), C.lb);
      ([[0.8, 0.26], [0.8, 0.5], [0.8, 0.74]] as const).forEach((t) => {
        iso.add(poly(o, 0.24, arrow(0.28, 0.5, t[0], t[1], 0.05, 0.12)), C.white);
      });
    },
  },

  // ---- Compute & data
  {
    id: "server",
    name: "Server (tower)",
    group: "Compute & data",
    h: 0.96,
    role: "Standalone server: file, app, or domain controller.",
    parts: [
      "Prism body 0.56×0.44×0.94",
      "Three drive-bay decals, power LED",
      "Five vent-line decals near the bottom",
    ],
    draw(iso, o) {
      iso.add(box(o, 0.24, 0.28, 0, 0.56, 0.44, 0.94), C.chassis);
      for (let i = 0; i < 3; i++) iso.add(front(o, 0.24, 0.33, 0.67, 0.5 + i * 0.1, 0.56 + i * 0.1), C.chassisLight);
      iso.add(led(o, 0.24, 0.47, 0.84, 0.04), C.ledOk);
      for (let j = 0; j < 5; j++) iso.add(front(o, 0.24, 0.36, 0.64, 0.1 + j * 0.06, 0.12 + j * 0.06), C.bay);
    },
  },
  {
    id: "rack",
    name: "Server rack",
    group: "Compute & data",
    h: 1.92,
    role: "Data-center rack; each band is one rack-mounted server.",
    parts: [
      "Prism cabinet 0.80×0.76×1.90",
      "8 unit decals on the front, alternating tone",
      "Two LED decals per unit",
      "Vent decal on top",
    ],
    draw(iso, o) {
      iso.add(box(o, 0.1, 0.12, 0, 0.8, 0.76, 1.9), C.chassis);
      iso.add(top(o, 1.9, 0.2, 0.8, 0.24, 0.76), C.bay);
      for (let i = 0; i < 8; i++) {
        const z = 0.1 + i * 0.22;
        iso.add(front(o, 0.1, 0.16, 0.84, z, z + 0.17), i % 2 ? C.bay : C.chassisLight);
        iso.add(front(o, 0.1, 0.22, 0.56, z + 0.07, z + 0.1), C.port);
        iso.add(led(o, 0.1, 0.7, z + 0.06, 0.035), C.ledOk);
        iso.add(led(o, 0.1, 0.76, z + 0.06, 0.035), i === 5 ? C.ledWarn : C.ledOk);
      }
    },
  },
  {
    id: "storage",
    name: "Storage / NAS",
    group: "Compute & data",
    h: 0.62,
    role: "Network-attached storage or SAN shelf.",
    parts: ["Prism body 0.48×0.60×0.60", "Four vertical drive-bay decals, one LED each"],
    draw(iso, o) {
      iso.add(box(o, 0.26, 0.2, 0, 0.48, 0.6, 0.6), C.chassis);
      for (let i = 0; i < 4; i++) {
        const y = 0.25 + i * 0.135;
        iso.add(front(o, 0.26, y, y + 0.1, 0.14, 0.52), C.chassisLight);
        iso.add(led(o, 0.26, y + 0.035, 0.06, 0.03), C.ledOk);
      }
    },
  },
  {
    id: "db",
    name: "Database",
    group: "Compute & data",
    h: 0.74,
    role: "Stateful data store. The classic stacked-disk icon.",
    parts: ["Three cylinders r0.34 h0.21 stacked with 0.04 gaps", "Lighter disc decal on the top face"],
    draw(iso, o) {
      for (let i = 0; i < 3; i++) iso.add(cyl(o, 0.5, 0.5, i * 0.25, 0.34, 0.21, 32), C.db);
      iso.add(disc(o, 0.5, 0.5, 0.71, 0.24, 32), C.dbTop);
    },
  },
  {
    id: "container",
    name: "Container host / VM",
    group: "Compute & data",
    h: 0.42,
    role: "A host running isolated workloads (Docker, Kubernetes node, hypervisor).",
    parts: ["Prism platform 0.84×0.84×0.12", "Four prism containers 0.30³, drawn far to near"],
    draw(iso, o) {
      iso.add(box(o, 0.08, 0.08, 0, 0.84, 0.84, 0.12), C.chassis);
      iso.add(box(o, 0.54, 0.54, 0.12, 0.3, 0.3, 0.28), C.db);
      iso.add(box(o, 0.54, 0.14, 0.12, 0.3, 0.3, 0.28), C.switchC);
      iso.add(box(o, 0.14, 0.54, 0.12, 0.3, 0.3, 0.28), C.lb);
      iso.add(box(o, 0.14, 0.14, 0.12, 0.3, 0.3, 0.28), C.router);
    },
  },
  {
    id: "cloud",
    name: "Cloud / Internet",
    group: "Compute & data",
    h: 0.9,
    role: "Anything outside your network: ISP, internet, a cloud provider.",
    parts: [
      "Translucent shadow disc on the floor",
      "Four cylinders of mixed radius and height floating at z 0.3",
      "Lobes sorted far-to-near",
    ],
    draw(iso, o) {
      iso.add(disc(o, 0.5, 0.5, 0, 0.4, 32), col(HEX.shadow, 0.12));
      ([
        [0.6, 0.6, 0.28, 0.46],
        [0.3, 0.62, 0.2, 0.3],
        [0.62, 0.3, 0.2, 0.34],
        [0.38, 0.38, 0.24, 0.22],
      ] as const).forEach((l) => {
        iso.add(cyl(o, l[0], l[1], 0.3, l[2], l[3], 32), C.cloud);
      });
    },
  },

  // ---- Scene & connection blocks
  {
    id: "terminator",
    name: "Bus terminator",
    group: "Scene & links",
    h: 0.2,
    role: "Caps each end of a bus backbone so signals do not reflect.",
    parts: ["Cylinder r0.14 h0.12", "Small cylinder cap r0.06"],
    draw(iso, o) {
      iso.add(cyl(o, 0.5, 0.5, 0, 0.14, 0.12), C.coax);
      iso.add(cyl(o, 0.5, 0.5, 0.12, 0.06, 0.06), C.fiber);
    },
  },
  {
    id: "port",
    name: "Port (RJ45)",
    group: "Scene & links",
    h: 0.2,
    role: "On devices a port is just a dark front decal; standalone it is a wall jack.",
    parts: ["Prism jack 0.12×0.30×0.18", "Dark slot decal on the front"],
    draw(iso, o) {
      iso.add(box(o, 0.44, 0.35, 0, 0.12, 0.3, 0.18), C.white);
      iso.add(front(o, 0.44, 0.42, 0.58, 0.05, 0.12), C.port);
    },
  },
];

export const byId: Record<string, TopoComponentDef> = Object.fromEntries(components.map((c) => [c.id, c]));

// ---------------------------------------------------------------------------
// 4. Links — cables drawn as flat strips on the floor
// ---------------------------------------------------------------------------

export const LINKS = {
  ethernet: { name: "Ethernet (copper)", hex: HEX.ethernet, w: 0.06 },
  fiber: { name: "Fiber", hex: HEX.fiber, w: 0.06 },
  wan: { name: "WAN / ISP uplink", hex: HEX.wan, w: 0.08 },
  coax: { name: "Bus backbone (coax)", hex: HEX.coax, w: 0.12 },
  wireless: { name: "Wireless", hex: HEX.wireless, w: 0.05, dotted: true },
} as const;

export type LinkKind = keyof typeof LINKS;

function strip(ax: number, ay: number, bx: number, by: number, w: number, z: number): Path {
  const L = Math.hypot(bx - ax, by - ay) || 1;
  const nx = (-(by - ay) / L) * (w / 2);
  const ny = ((bx - ax) / L) * (w / 2);
  const pts = [
    [ax + nx, ay + ny],
    [bx + nx, by + ny],
    [bx - nx, by - ny],
    [ax - nx, ay - ny],
  ];
  return poly({ x: 0, y: 0, z: 0 }, z, pts);
}

export function drawLink(iso: Isomer, pts: number[][], kind: LinkKind): void {
  const k = LINKS[kind] ?? LINKS.ethernet;
  const c = col(k.hex);
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if ("dotted" in k && k.dotted) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.floor(L / 0.2));
      for (let j = 0; j <= n; j++) {
        const t = j / n;
        iso.add(Path.Circle(new Point(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.006), 0.035, 10), c);
      }
    } else {
      iso.add(strip(a[0], a[1], b[0], b[1], k.w, 0.006), c);
      if (i > 0) {
        iso.add(
          poly({ x: 0, y: 0, z: 0 }, 0.007, [
            [a[0] - k.w / 2, a[1] - k.w / 2],
            [a[0] + k.w / 2, a[1] - k.w / 2],
            [a[0] + k.w / 2, a[1] + k.w / 2],
            [a[0] - k.w / 2, a[1] + k.w / 2],
          ]),
          c,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Scene blocks: floor, zones, packets
// ---------------------------------------------------------------------------

export const ZONES = { lan: "#3E9B63", dmz: "#D9A21B", wan: "#8B5CF6", mgmt: "#0F9E95" } as const;
export type ZoneKind = keyof typeof ZONES;

function mixHex(a: string, b: string, t: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const r = [16, 8, 0].map((s) => Math.round((((x >> s) & 255) * (1 - t)) + (((y >> s) & 255) * t)));
  return `#${r.map((v) => `0${v.toString(16)}`.slice(-2)).join("")}`;
}

export type SceneTheme = { floor: string; floorAlt: string; zoneMix: number; select: string };

export function drawFloor(iso: Isomer, w: number, d: number, theme: SceneTheme): void {
  const base = theme.floor;
  const alt = theme.floorAlt;
  iso.add(Shape.Prism(new Point(0, 0, -0.16), w, d, 0.16), col(base));
  const O: Origin = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < d; j++) {
      if ((i + j) % 2) iso.add(top(O, 0, i, i + 1, j, j + 1), col(alt));
    }
  }
}

export type SceneZone = { x: number; y: number; w: number; d: number; type: ZoneKind; label?: string };

export function drawZone(iso: Isomer, zone: SceneZone, theme: SceneTheme): void {
  const O: Origin = { x: 0, y: 0, z: 0 };
  const c = ZONES[zone.type] ?? ZONES.lan;
  const b = 0.035;
  iso.add(top(O, 0.001, zone.x, zone.x + zone.w, zone.y, zone.y + zone.d), col(mixHex(theme.floor, c, theme.zoneMix)));
  const e = col(mixHex(c, theme.floor, 0.35));
  iso.add(top(O, 0.002, zone.x, zone.x + zone.w, zone.y, zone.y + b), e);
  iso.add(top(O, 0.002, zone.x, zone.x + zone.w, zone.y + zone.d - b, zone.y + zone.d), e);
  iso.add(top(O, 0.002, zone.x, zone.x + b, zone.y, zone.y + zone.d), e);
  iso.add(top(O, 0.002, zone.x + zone.w - b, zone.x + zone.w, zone.y, zone.y + zone.d), e);
}

export function drawPacket(iso: Isomer, x: number, y: number, hex?: string): void {
  iso.add(Shape.Prism(new Point(x - 0.07, y - 0.07, 0.01), 0.14, 0.14, 0.14), col(hex ?? HEX.packet));
}

// ---------------------------------------------------------------------------
// 6. Routing + draw order
// ---------------------------------------------------------------------------

export type SceneNode = { id: string; type: string; x: number; y: number; label?: string };

export type SceneLink = {
  a: string;
  /** Omit when `to` gives a fixed point instead — a drop cable onto a backbone. */
  b?: string;
  kind: LinkKind;
  /** Route straight across a shared axis first, then the other — for L-shaped drops onto a backbone. */
  route?: "xy" | "yx";
  /** Explicit waypoints between the endpoints. */
  via?: number[][];
  /** Route to a fixed point instead of a node — a drop cable onto a backbone. */
  to?: number[];
  /** Reverses the packet's travel direction along this link during animation. */
  reverse?: boolean;
  label?: string;
};

export type TopoScene = {
  w: number;
  d: number;
  zones?: SceneZone[];
  nodes: SceneNode[];
  links: SceneLink[];
  selected?: string | null;
};

function route(link: SceneLink, A: SceneNode, B: SceneNode | undefined): number[][] {
  const a = [A.x + 0.5, A.y + 0.5];
  if (link.to) return [a, link.to];
  const b = [(B?.x ?? A.x) + 0.5, (B?.y ?? A.y) + 0.5];
  if (link.via) return [a, ...link.via, b];
  if (link.route === "xy" && a[0] !== b[0] && a[1] !== b[1]) return [a, [b[0], a[1]], b];
  if (link.route === "yx" && a[0] !== b[0] && a[1] !== b[1]) return [a, [a[0], b[1]], b];
  return [a, b];
}

function pointAt(pts: number[][], u: number): number[] {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lens.push(l);
    total += l;
  }
  let d = u * total;
  for (let j = 0; j < lens.length; j++) {
    if (d <= lens[j] || j === lens.length - 1) {
      const t = lens[j] ? Math.min(1, d / lens[j]) : 0;
      return [pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t];
    }
    d -= lens[j];
  }
  return pts[pts.length - 1];
}

type DrawObj = { d: number; n?: SceneNode; p?: number[]; hex?: string };

/** Painter's algorithm across objects: larger x + y (farther) first. */
export function renderScene(iso: Isomer, scene: TopoScene, theme: SceneTheme, time?: number | null): void {
  const nodes: Record<string, SceneNode> = {};
  scene.nodes.forEach((n) => {
    nodes[n.id] = n;
  });

  drawFloor(iso, scene.w, scene.d, theme);
  (scene.zones ?? []).forEach((z) => drawZone(iso, z, theme));

  if (scene.selected) {
    const s = nodes[scene.selected];
    if (s) {
      iso.add(
        top({ x: 0, y: 0, z: 0 }, 0.003, s.x + 0.04, s.x + 0.96, s.y + 0.04, s.y + 0.96),
        col(theme.select, 0.55),
      );
    }
  }

  const routes = scene.links.map((l) => route(l, nodes[l.a], l.b ? nodes[l.b] : undefined));
  scene.links.forEach((l, i) => drawLink(iso, routes[i], l.kind));

  const objs: DrawObj[] = scene.nodes.map((n) => ({ d: n.x + n.y + 1, n }));

  if (time != null) {
    scene.links.forEach((l, i) => {
      const A = nodes[l.a];
      const B = l.b ? nodes[l.b] : undefined;
      if (!A) return;
      const pts = routes[i];
      let L = 0;
      for (let k = 0; k < pts.length - 1; k++) L += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]);
      let u = ((time * 1.2) / L + i * 0.37) % 1;
      if (l.reverse) u = 1 - u;
      const p = pointAt(pts, u);
      const inside = (N: SceneNode) => p[0] > N.x + 0.05 && p[0] < N.x + 0.95 && p[1] > N.y + 0.05 && p[1] < N.y + 0.95;
      if (inside(A) || (B && inside(B))) return;
      objs.push({ d: p[0] + p[1], p, hex: l.kind === "wireless" ? HEX.wireless : HEX.packet });
    });
  }

  objs.sort((a, b) => b.d - a.d);
  objs.forEach((ob) => {
    if (ob.n) {
      const def = byId[ob.n.type];
      if (def) def.draw(iso, { x: ob.n.x, y: ob.n.y, z: 0 });
    } else if (ob.p) {
      drawPacket(iso, ob.p[0], ob.p[1], ob.hex);
    }
  });
}

/** Mirrors Isomer's own internal projection — for labels and hit-testing outside `iso.add`. */
export function project(iso: Isomer, x: number, y: number, z: number): { x: number; y: number } {
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  const k = iso.scale;
  return { x: iso.originX + (x - y) * k * c, y: iso.originY - (x + y) * k * s - z * k };
}
