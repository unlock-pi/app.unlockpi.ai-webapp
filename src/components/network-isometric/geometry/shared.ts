import { Color, Path, Point, Shape } from "isomer";

/** One colored solid. A device's `pieces` list is just several of these. */
export type Piece = { shape: Shape; color: Color };

const P = (x: number, y: number, z: number) => new Point(x, y, z);

/** The one palette every device in the library draws from — this is what makes them read as one system. */
export const PALETTE = {
  body: new Color(71, 85, 105), // slate — the default chassis color
  bodyLight: new Color(148, 163, 184),
  bodyDark: new Color(51, 65, 85),
  accent: new Color(79, 70, 229), // indigo — network devices
  accentLight: new Color(129, 140, 248),
  screen: new Color(56, 189, 248), // sky — anything showing content
  screenGlow: new Color(125, 211, 252, 0.9),
  ok: new Color(16, 185, 129), // emerald — active/idle indicator
  warn: new Color(245, 158, 11), // amber — ports, protocol
  error: new Color(239, 68, 68),
  paper: new Color(241, 245, 249),
  cloud: new Color(226, 232, 240, 0.9),
  copper: new Color(180, 130, 60),
  fiber: new Color(224, 255, 255, 0.85),
  wireless: new Color(56, 189, 248, 0.55),
};

/** A flat rectangular slab — the base building block for panels, trays, and platforms. */
export function slab(origin: { x: number; y: number; z: number }, w: number, d: number, h: number, color: Color): Piece {
  return { shape: Shape.Prism(P(origin.x, origin.y, origin.z), w, d, h), color };
}

/** A row of evenly spaced port nubs along a device's front edge — shared by every network device. */
export function portRow(
  originX: number,
  y: number,
  z: number,
  count: number,
  span: number,
  color: Color = PALETTE.warn,
): Piece[] {
  if (count <= 0) return [];
  const gap = span / count;
  const pieces: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const x = originX + gap * i + gap * 0.25;
    pieces.push(slab({ x, y, z }, gap * 0.5, 0.03, 0.08, color));
  }
  return pieces;
}

/** Small status LEDs — reused by mainframes, servers, hubs, switches, routers, modems. */
export function indicatorLights(
  originX: number,
  y: number,
  z: number,
  count: number,
  spacing: number,
  color: Color = PALETTE.ok,
): Piece[] {
  const pieces: Piece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push(slab({ x: originX + i * spacing, y, z }, 0.05, 0.03, 0.05, color));
  }
  return pieces;
}

/** A rectangular display: bezel + inset screen. Shared by Monitor, DesktopComputer, and Laptop. */
export function monitorPanel(
  origin: { x: number; y: number; z: number },
  width: number,
  height: number,
  depth = 0.04,
): Piece[] {
  return [
    slab(origin, width, depth, height, PALETTE.bodyDark),
    slab(
      { x: origin.x + width * 0.08, y: origin.y - 0.005, z: origin.z + height * 0.1 },
      width * 0.84,
      depth * 0.4,
      height * 0.8,
      PALETTE.screen,
    ),
  ];
}

/** The ground tile every component rests on, tinted by status — keeps devices visually grounded and connected to the grid. */
export function platform(status: "idle" | "active" | "error" | "offline" | undefined): Piece {
  const tint =
    status === "active" ? PALETTE.ok : status === "error" ? PALETTE.error : status === "offline" ? null : null;
  const base = new Color(51, 65, 85, status === "offline" ? 0.35 : 0.85);
  return slab({ x: 0, y: 0, z: -0.06 }, 1, 1, 0.06, tint ? tint.lighten(-0.35) : base);
}

/**
 * A thin filled wedge in the XY plane, centered on angle 0 (pointing +x),
 * lifted to `z`. Reused for both the AccessPoint's static signal glyph and a
 * WirelessLink's traveling wave markers — the only two places a "no cable"
 * connection needs to be drawn.
 */
export function signalArc(originX: number, originY: number, z: number, innerR: number, outerR: number, color = PALETTE.wireless): Piece {
  const segments = 10;
  const start = -Math.PI * 0.28;
  const end = Math.PI * 0.28;
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = start + ((end - start) * i) / segments;
    points.push(new Point(originX + Math.cos(a) * outerR, originY + Math.sin(a) * outerR, z));
  }
  for (let i = segments; i >= 0; i--) {
    const a = start + ((end - start) * i) / segments;
    points.push(new Point(originX + Math.cos(a) * innerR, originY + Math.sin(a) * innerR, z));
  }
  return { shape: new Shape([new Path(points)]), color };
}

export { P };
