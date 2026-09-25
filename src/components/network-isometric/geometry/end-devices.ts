import type { Point } from "isomer";

import type { Vec3 } from "../model";
import { indicatorLights, monitorPanel, P, PALETTE, slab, type Piece } from "./shared";

export type Geometry = { pieces: Piece[]; footprint: Vec3; ports: Vec3[] };

/** Bezel + screen tilted together about a hinge — the one thing Laptop needs that nothing else does. */
function tiltedPanel(hinge: Point, origin: Vec3, width: number, height: number, angle: number): Piece[] {
  return monitorPanel(origin, width, height).map((piece) => ({
    shape: piece.shape.rotateX(hinge, angle),
    color: piece.color,
  }));
}

export function buildDesktop(): Geometry {
  return {
    pieces: [
      slab({ x: 0.15, y: 0.15, z: 0 }, 0.7, 0.22, 0.03, PALETTE.bodyDark),
      slab({ x: 0.3, y: 0.42, z: 0 }, 0.4, 0.22, 0.05, PALETTE.bodyDark),
      slab({ x: 0.46, y: 0.5, z: 0.05 }, 0.08, 0.08, 0.3, PALETTE.bodyDark),
      ...monitorPanel({ x: 0.28, y: 0.55, z: 0.35 }, 0.44, 0.34),
    ],
    footprint: { x: 1, y: 1, z: 0.9 },
    ports: [{ x: 0.5, y: 0.9, z: 0.12 }],
  };
}

export function buildLaptop(): Geometry {
  const hingeY = 0.64;
  const hinge = P(0.5, hingeY, 0.04);
  return {
    pieces: [
      slab({ x: 0.22, y: 0.28, z: 0 }, 0.56, 0.36, 0.04, PALETTE.bodyDark),
      ...tiltedPanel(hinge, { x: 0.22, y: hingeY - 0.03, z: 0.04 }, 0.56, 0.4, -0.25),
    ],
    footprint: { x: 1, y: 1, z: 0.5 },
    ports: [{ x: 0.5, y: hingeY, z: 0.02 }],
  };
}

export function buildMonitor(): Geometry {
  return {
    pieces: [
      slab({ x: 0.4, y: 0.44, z: 0 }, 0.2, 0.12, 0.04, PALETTE.bodyDark),
      slab({ x: 0.46, y: 0.48, z: 0.04 }, 0.08, 0.06, 0.28, PALETTE.bodyDark),
      ...monitorPanel({ x: 0.22, y: 0.52, z: 0.32 }, 0.56, 0.4),
    ],
    footprint: { x: 1, y: 1, z: 0.75 },
    ports: [{ x: 0.5, y: 0.94, z: 0.15 }],
  };
}

export function buildMainframe(): Geometry {
  return {
    pieces: [
      slab({ x: 0.15, y: 0.15, z: 0 }, 0.7, 0.7, 1.2, PALETTE.body),
      slab({ x: 0.22, y: 0.08, z: 0.15 }, 0.56, 0.03, 0.9, PALETTE.bodyDark),
      ...indicatorLights(0.26, 0.06, 0.95, 3, 0.1, PALETTE.ok),
    ],
    footprint: { x: 1, y: 1, z: 1.2 },
    ports: [{ x: 0.5, y: 0.06, z: 0.15 }],
  };
}

export function buildServer(): Geometry {
  const pieces: Piece[] = [slab({ x: 0.15, y: 0.15, z: 0 }, 0.7, 0.7, 1.05, PALETTE.body)];
  for (const z of [0.15, 0.45, 0.75]) {
    pieces.push(slab({ x: 0.2, y: 0.06, z }, 0.6, 0.05, 0.18, PALETTE.bodyLight));
    pieces.push(...indicatorLights(0.24, 0.03, z + 0.06, 1, 0, PALETTE.ok));
  }
  return {
    pieces,
    footprint: { x: 1, y: 1, z: 1.05 },
    ports: [{ x: 0.5, y: 0.06, z: 0.15 }],
  };
}

export function buildPrinter(): Geometry {
  const trayHinge = P(0.75, 0.35, 0.3);
  const tray = slab({ x: 0.75, y: 0.2, z: 0.3 }, 0.22, 0.3, 0.02, PALETTE.bodyDark);
  return {
    pieces: [
      slab({ x: 0.15, y: 0.15, z: 0 }, 0.6, 0.5, 0.3, PALETTE.body),
      slab({ x: 0.2, y: 0.18, z: 0.3 }, 0.18, 0.1, 0.03, PALETTE.accentLight),
      { shape: tray.shape.rotateX(trayHinge, 0.35), color: tray.color },
    ],
    footprint: { x: 1, y: 1, z: 0.35 },
    ports: [{ x: 0.5, y: 0.06, z: 0.1 }],
  };
}

export function buildSmartphone(): Geometry {
  return {
    pieces: [
      slab({ x: 0.42, y: 0.44, z: 0 }, 0.16, 0.04, 0.02, PALETTE.bodyDark),
      ...monitorPanel({ x: 0.4, y: 0.46, z: 0.02 }, 0.2, 0.36, 0.025),
    ],
    footprint: { x: 1, y: 1, z: 0.4 },
    ports: [{ x: 0.5, y: 0.5, z: 0.05 }],
  };
}
