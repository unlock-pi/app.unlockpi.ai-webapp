import { Point, Shape } from "isomer";

import { P, PALETTE, slab, type Piece } from "./shared";
import type { Geometry } from "./end-devices";

/** Message: a small card with a folded envelope flap. */
export function buildMessage(): Geometry {
  const flapHinge = P(0.5, 0.35, 0.14);
  const flap = Shape.Pyramid(P(0.32, 0.35, 0.14), 0.36, 0.001, 0.001).rotateX(flapHinge, -1.9);
  return {
    pieces: [
      slab({ x: 0.3, y: 0.3, z: 0 }, 0.4, 0.28, 0.06, PALETTE.paper),
      { shape: flap, color: PALETTE.bodyLight },
    ],
    footprint: { x: 1, y: 1, z: 0.2 },
    ports: [{ x: 0.5, y: 0.5, z: 0.03 }],
  };
}

/** DataPacket: a stacked header (amber) over a body (indigo) — visually distinct from Message. */
export function buildDataPacket(): Geometry {
  return {
    pieces: [
      slab({ x: 0.34, y: 0.34, z: 0 }, 0.32, 0.32, 0.14, PALETTE.accent),
      slab({ x: 0.34, y: 0.34, z: 0.14 }, 0.32, 0.32, 0.06, PALETTE.warn),
    ],
    footprint: { x: 1, y: 1, z: 0.2 },
    ports: [{ x: 0.5, y: 0.5, z: 0.1 }],
  };
}

/** Protocol: a card with a header band and three step ticks. */
export function buildProtocol(): Geometry {
  const pieces: Piece[] = [
    slab({ x: 0.26, y: 0.3, z: 0 }, 0.48, 0.06, 0.36, PALETTE.paper),
    slab({ x: 0.26, y: 0.3, z: 0.3 }, 0.48, 0.065, 0.06, PALETTE.accent),
  ];
  for (let i = 0; i < 3; i++) {
    pieces.push(slab({ x: 0.32, y: 0.28, z: 0.06 + i * 0.08 }, 0.16, 0.02, 0.04, PALETTE.bodyLight));
  }
  return {
    pieces,
    footprint: { x: 1, y: 1, z: 0.4 },
    ports: [{ x: 0.5, y: 0.5, z: 0.18 }],
  };
}

/** A single flat triangular chevron pointing along local +x, used by all three arrow markers. */
function chevron(color = PALETTE.accent) {
  const shape = Shape.Pyramid(new Point(-0.1, -0.06, 0.02), 0.2, 0.12, 0.001);
  return { shape: shape.rotateX(new Point(0, 0, 0.02), Math.PI / 2), color };
}

export function buildArrowForward(): Geometry {
  return { pieces: [chevron(PALETTE.ok)], footprint: { x: 0.2, y: 0.12, z: 0.02 }, ports: [] };
}

export function buildArrowReverse(): Geometry {
  const forward = chevron(PALETTE.error);
  return {
    pieces: [{ shape: forward.shape.rotateZ(new Point(0, 0, 0), Math.PI), color: forward.color }],
    footprint: { x: 0.2, y: 0.12, z: 0.02 },
    ports: [],
  };
}

export function buildArrowBidirectional(): Geometry {
  const forward = chevron(PALETTE.accent);
  const reverse = { shape: forward.shape.rotateZ(new Point(0, 0, 0), Math.PI), color: forward.color };
  return {
    pieces: [
      { shape: forward.shape.translate(0.14, 0, 0), color: forward.color },
      { shape: reverse.shape.translate(-0.14, 0, 0), color: reverse.color },
    ],
    footprint: { x: 0.4, y: 0.12, z: 0.02 },
    ports: [],
  };
}

export const DATA_OBJECT_BUILDERS = {
  message: buildMessage,
  "data-packet": buildDataPacket,
  protocol: buildProtocol,
};

export const ARROW_BUILDERS = {
  "arrow-forward": buildArrowForward,
  "arrow-reverse": buildArrowReverse,
  "arrow-bidirectional": buildArrowBidirectional,
};
