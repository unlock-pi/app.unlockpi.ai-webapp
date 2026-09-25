import { Color, Point, Shape } from "isomer";

import type { ConnectionType, Vec3 } from "../model";
import { PALETTE, signalArc, type Piece } from "./shared";

export type ConnectionVisualOptions = {
  /** Overrides the type's default cable thickness. */
  thickness?: number;
  /** How high the cable bows upward at its midpoint. 0 = perfectly straight. */
  curvature?: number;
  disabled?: boolean;
};

type CableStyle = { width: number; height: number; color: Color };

const CABLE_STYLE: Record<Exclude<ConnectionType, "wireless">, CableStyle> = {
  cable: { width: 0.05, height: 0.04, color: PALETTE.copper },
  backbone: { width: 0.08, height: 0.06, color: PALETTE.bodyDark },
  fiber: { width: 0.03, height: 0.03, color: PALETTE.fiber },
  coaxial: { width: 0.1, height: 0.1, color: PALETTE.bodyLight },
};

/** One straight cable segment between two arbitrary world points, oriented and colored for its type. */
function straightSegment(from: Vec3, to: Vec3, width: number, height: number, color: Color): Piece {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const local = Shape.Prism(new Point(0, -width / 2, from.z), length, width, height);
  const shape = local.rotateZ(Point.ORIGIN, angle).translate(from.x, from.y, 0);
  return { shape, color };
}

/**
 * NetworkCable / BackboneCable / FiberCable / CoaxialCable all resolve here —
 * they only differ in width/height/color and whether they bow (`curvature`).
 * WirelessLink has no physical cable at all, so it's handled separately.
 */
export function buildWiredConnection(
  type: Exclude<ConnectionType, "wireless">,
  from: Vec3,
  to: Vec3,
  opts: ConnectionVisualOptions = {},
): Piece[] {
  const style = CABLE_STYLE[type];
  const width = opts.thickness ?? style.width;
  const color = opts.disabled ? new Color(style.color.r, style.color.g, style.color.b, 0.3) : style.color;

  if (!opts.curvature) {
    return [straightSegment(from, to, width, style.height, color)];
  }

  const mid: Vec3 = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
    z: (from.z + to.z) / 2 + opts.curvature,
  };
  return [straightSegment(from, mid, width, style.height, color), straightSegment(mid, to, width, style.height, color)];
}

/** WirelessLink: three traveling signal arcs facing along the link direction — no cable. */
export function buildWirelessConnection(from: Vec3, to: Vec3): Piece[] {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  const pieces: Piece[] = [];
  for (const t of [0.28, 0.5, 0.72]) {
    const arc = signalArc(0, 0, from.z + 0.12, length * 0.03, length * 0.09);
    pieces.push({
      shape: arc.shape.rotateZ(Point.ORIGIN, angle).translate(from.x + dx * t, from.y + dy * t, 0),
      color: arc.color,
    });
  }
  return pieces;
}

export function buildConnectionGeometry(
  type: ConnectionType,
  from: Vec3,
  to: Vec3,
  opts: ConnectionVisualOptions = {},
): Piece[] {
  return type === "wireless" ? buildWirelessConnection(from, to) : buildWiredConnection(type, from, to, opts);
}
