import type { Vec3 } from "../model";
import { indicatorLights, PALETTE, portRow, signalArc, slab, type Piece } from "./shared";
import type { Geometry } from "./end-devices";

/** Two ports of a Repeater — an input nub and an output nub, nothing else. */
function connectionNub(x: number, y: number, z: number): Piece {
  return slab({ x, y, z }, 0.09, 0.09, 0.12, PALETTE.accentLight);
}

export function buildHub(portCount = 4): Geometry {
  return {
    pieces: [
      slab({ x: 0.05, y: 0.3, z: 0 }, 0.9, 0.4, 0.24, PALETTE.body),
      ...portRow(0.1, 0.28, 0.06, portCount, 0.8),
      ...indicatorLights(0.12, 0.28, 0.2, portCount, 0.8 / portCount, PALETTE.ok),
    ],
    footprint: { x: 1, y: 1, z: 0.24 },
    ports: Array.from({ length: portCount }, (_, i) => ({
      x: 0.14 + (0.72 / Math.max(1, portCount - 1 || 1)) * i,
      y: 0.28,
      z: 0.1,
    })),
  };
}

export function buildSwitch(portCount = 8): Geometry {
  return {
    pieces: [
      slab({ x: 0.02, y: 0.32, z: 0 }, 0.96, 0.36, 0.2, PALETTE.bodyDark),
      ...portRow(0.06, 0.3, 0.05, portCount, 0.88, PALETTE.warn),
      ...indicatorLights(0.08, 0.3, 0.16, portCount, 0.88 / portCount, PALETTE.accentLight),
    ],
    footprint: { x: 1, y: 1, z: 0.2 },
    ports: Array.from({ length: portCount }, (_, i) => ({
      x: 0.1 + (0.8 / Math.max(1, portCount - 1 || 1)) * i,
      y: 0.3,
      z: 0.08,
    })),
  };
}

export function buildRouter(portCount = 4): Geometry {
  return {
    pieces: [
      slab({ x: 0.2, y: 0.2, z: 0 }, 0.6, 0.6, 0.28, PALETTE.accent),
      slab({ x: 0.44, y: 0.44, z: 0.28 }, 0.05, 0.05, 0.34, PALETTE.bodyLight),
      slab({ x: 0.68, y: 0.68, z: 0.28 }, 0.05, 0.05, 0.26, PALETTE.bodyLight),
      ...portRow(0.26, 0.18, 0.04, portCount, 0.48, PALETTE.warn),
      ...indicatorLights(0.3, 0.18, 0.14, portCount, 0.48 / portCount, PALETTE.ok),
    ],
    footprint: { x: 1, y: 1, z: 0.62 },
    ports: Array.from({ length: portCount }, (_, i) => ({
      x: 0.3 + (0.4 / Math.max(1, portCount - 1 || 1)) * i,
      y: 0.18,
      z: 0.08,
    })),
  };
}

export function buildModem(portCount = 2): Geometry {
  return {
    pieces: [
      slab({ x: 0.28, y: 0.32, z: 0 }, 0.44, 0.36, 0.16, PALETTE.bodyDark),
      ...portRow(0.32, 0.3, 0.04, portCount, 0.36, PALETTE.warn),
      ...indicatorLights(0.34, 0.3, 0.12, 3, 0.09, PALETTE.ok),
    ],
    footprint: { x: 1, y: 1, z: 0.16 },
    ports: Array.from({ length: portCount }, (_, i) => ({
      x: 0.36 + (0.28 / Math.max(1, portCount - 1 || 1)) * i,
      y: 0.3,
      z: 0.06,
    })),
  };
}

export function buildRepeater(): Geometry {
  return {
    pieces: [
      slab({ x: 0.38, y: 0.42, z: 0 }, 0.24, 0.16, 0.12, PALETTE.bodyLight),
      connectionNub(0.34, 0.46, 0.02),
      connectionNub(0.58, 0.46, 0.02),
    ],
    footprint: { x: 1, y: 1, z: 0.12 },
    ports: [
      { x: 0.36, y: 0.5, z: 0.06 },
      { x: 0.64, y: 0.5, z: 0.06 },
    ],
  };
}

export function buildAccessPoint(): Geometry {
  return {
    pieces: [
      slab({ x: 0.35, y: 0.35, z: 0 }, 0.3, 0.3, 0.06, PALETTE.bodyLight),
      slab({ x: 0.47, y: 0.47, z: 0.06 }, 0.06, 0.06, 0.14, PALETTE.bodyDark),
      signalArc(0.5, 0.5, 0.24, 0.18, 0.24),
      signalArc(0.5, 0.5, 0.24, 0.28, 0.34),
    ],
    footprint: { x: 1, y: 1, z: 0.24 },
    ports: [{ x: 0.5, y: 0.5, z: 0.1 }],
  };
}

export const NETWORK_DEVICE_BUILDERS: Record<string, (portCount?: number) => Geometry> = {
  hub: buildHub,
  switch: buildSwitch,
  router: buildRouter,
  modem: buildModem,
  repeater: buildRepeater,
  "access-point": buildAccessPoint,
};

export type { Vec3 };
