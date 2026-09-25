"use client";

import Isomer, { Point } from "isomer";
import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { ARROW_BUILDERS } from "./geometry/data-objects";
import { platform, type Piece } from "./geometry/shared";
import { getComponentGeometry } from "./geometry/registry";
import { buildConnectionGeometry } from "./geometry/connections";
import type { NetworkComponent, NetworkDiagram, Port, Vec3 } from "./model";

export type NetworkSceneProps = {
  diagram: NetworkDiagram;
  className?: string;
  onComponentClick?: (componentId: string) => void;
};

const GROUNDED_TYPES = new Set([
  "desktop",
  "laptop",
  "monitor",
  "mainframe",
  "server",
  "printer",
  "smartphone",
  "hub",
  "switch",
  "router",
  "modem",
  "repeater",
  "access-point",
]);

const DIRECTION_ARROW = {
  forward: "arrow-forward",
  reverse: "arrow-reverse",
  bidirectional: "arrow-bidirectional",
} as const;

function rotateOffset(offset: Vec3, rotation: number): Vec3 {
  if (!rotation) return offset;
  const dx = offset.x - 0.5;
  const dy = offset.y - 0.5;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return { x: 0.5 + dx * cos - dy * sin, y: 0.5 + dx * sin + dy * cos, z: offset.z };
}

function componentCenter(component: NetworkComponent): Vec3 {
  return { x: component.position.x + 0.5, y: component.position.y + 0.5, z: component.position.z };
}

function portWorldPosition(component: NetworkComponent, port: Port): Vec3 {
  const rotated = rotateOffset(port.offset, component.rotation ?? 0);
  return {
    x: component.position.x + rotated.x,
    y: component.position.y + rotated.y,
    z: component.position.z + rotated.z,
  };
}

function anchorFor(component: NetworkComponent | undefined, portId?: string): Vec3 | null {
  if (!component) return null;
  const port = (portId ? component.ports?.find((p) => p.id === portId) : component.ports?.[0]) ?? null;
  return port ? portWorldPosition(component, port) : componentCenter(component);
}

function lerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

/** Mirrors Isomer's own `_translatePoint` so labels/arrows/hit-testing can be projected outside of `iso.add`. */
function project(point: Vec3, camera: { scale: number; originX: number; originY: number }) {
  const angle = Math.PI / 6;
  const t00 = camera.scale * Math.cos(angle);
  const t01 = camera.scale * Math.sin(angle);
  const t10 = camera.scale * Math.cos(Math.PI - angle);
  const t11 = camera.scale * Math.sin(Math.PI - angle);
  return {
    x: camera.originX + point.x * t00 + point.y * t10,
    y: camera.originY - point.x * t01 - point.y * t11 - point.z * camera.scale,
  };
}

type DrawItem = { depth: number; run: () => void };

export function NetworkScene({ diagram, className, onComponentClick }: NetworkSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 720, height: 460 });
  const originRef = useRef({ originX: 0, originY: 0 });

  // Per-component geometry (rotated + scaled, not yet translated) is cached
  // here and only rebuilt when that component's own shape-affecting fields
  // change — a packet's flowProgress ticking every frame shouldn't force
  // every device on the canvas to be re-derived from its primitives.
  const componentCache = useRef(new Map<string, { key: string; pieces: Piece[] }>());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const componentsById = useMemo(() => new Map(diagram.components.map((c) => [c.id, c])), [diagram.components]);

  const bounds = useMemo(() => {
    if (diagram.components.length === 0) return { minX: -1, maxX: 3, minY: -1, maxY: 3 };
    const xs = diagram.components.map((c) => c.position.x);
    const ys = diagram.components.map((c) => c.position.y);
    return {
      minX: Math.min(...xs) - 0.5,
      maxX: Math.max(...xs) + 1.5,
      minY: Math.min(...ys) - 0.5,
      maxY: Math.max(...ys) + 1.5,
    };
  }, [diagram.components]);

  const camera = useMemo(() => {
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const pixelWidth = size.width * dpr;
    const pixelHeight = size.height * dpr;
    const spanX = Math.max(1, bounds.maxX - bounds.minX);
    const spanY = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(pixelWidth / (spanX + 2.2), pixelHeight / (spanY + 3.2));
    return {
      dpr,
      pixelWidth,
      pixelHeight,
      scale,
      originY: pixelHeight * 0.86,
      centerX: (bounds.minX + bounds.maxX) / 2,
      centerY: (bounds.minY + bounds.maxY) / 2,
    };
  }, [size, bounds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = camera.pixelWidth;
    canvas.height = camera.pixelHeight;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const centerProjection = project(
      { x: camera.centerX, y: camera.centerY, z: 0 },
      { scale: camera.scale, originX: camera.pixelWidth / 2, originY: camera.originY },
    );
    const originX = camera.pixelWidth - centerProjection.x;
    const originY = camera.originY;
    originRef.current = { originX, originY };

    const iso = new Isomer(canvas, { scale: camera.scale, originX, originY });
    iso.canvas.clear();

    const drawItems: DrawItem[] = [];
    const labelItems: { x: number; y: number; text: string; dim?: boolean }[] = [];

    for (const component of diagram.components) {
      const geometry = getComponentGeometry(component.type, component.portCount);
      const cacheKey = `${component.type}:${component.portCount ?? ""}:${component.rotation ?? 0}:${component.scale ?? 1}:${component.status ?? "idle"}`;
      let cached = componentCache.current.get(component.id);
      if (!cached || cached.key !== cacheKey) {
        const rotation = component.rotation ?? 0;
        const scale = component.scale ?? 1;
        const pivot = new Point(0.5, 0.5, 0);
        const pieces = geometry.pieces.map((piece) => {
          let shape = piece.shape;
          if (scale !== 1) shape = shape.scale(pivot, scale);
          if (rotation) shape = shape.rotateZ(pivot, rotation);
          return { shape, color: piece.color };
        });
        const grounded = GROUNDED_TYPES.has(component.type) ? [platform(component.status)] : [];
        cached = { key: cacheKey, pieces: [...grounded, ...pieces] };
        componentCache.current.set(component.id, cached);
      }

      const depth = component.position.x + component.position.y + 0.5;
      drawItems.push({
        depth,
        run: () => {
          for (const piece of cached!.pieces) {
            iso.add(piece.shape.translate(component.position.x, component.position.y, component.position.z), piece.color);
          }
        },
      });

      if (component.label) {
        const geo = getComponentGeometry(component.type, component.portCount);
        const anchor = project(
          {
            x: component.position.x + 0.5,
            y: component.position.y + 0.5,
            z: component.position.z + geo.footprint.z + 0.35,
          },
          { scale: camera.scale, originX, originY },
        );
        labelItems.push({ x: anchor.x, y: anchor.y, text: component.label, dim: component.status === "offline" });
      }
    }

    for (const connection of diagram.connections) {
      const source = componentsById.get(connection.sourceComponentId);
      const target = componentsById.get(connection.targetComponentId);
      const from = anchorFor(source, connection.sourcePortId);
      const to = anchorFor(target, connection.targetPortId);
      if (!from || !to) continue;

      const pieces = buildConnectionGeometry(connection.type, from, to, {});
      const depth = (from.x + from.y + to.x + to.y) / 2 - 0.05;
      drawItems.push({ depth, run: () => { for (const piece of pieces) iso.add(piece.shape, piece.color); } });

      const mid = lerpVec(from, to, 0.5);
      const arrowType = connection.direction ? DIRECTION_ARROW[connection.direction as keyof typeof DIRECTION_ARROW] : undefined;
      if (arrowType) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const arrowGeometry = ARROW_BUILDERS[arrowType]();
        const pivot = new Point(0, 0, 0);
        drawItems.push({
          depth: depth + 0.01,
          run: () => {
            for (const piece of arrowGeometry.pieces) {
              const shape = piece.shape.rotateZ(pivot, angle).translate(mid.x, mid.y, mid.z + 0.2);
              iso.add(shape, piece.color);
            }
          },
        });
      }

      if (typeof connection.flowProgress === "number") {
        const packetGeometry = getComponentGeometry("data-packet");
        const packetPos = lerpVec(from, to, connection.flowProgress);
        drawItems.push({
          depth: depth + 0.02,
          run: () => {
            for (const piece of packetGeometry.pieces) {
              iso.add(
                piece.shape.scale(new Point(0.5, 0.5, 0), 0.5).translate(packetPos.x - 0.25, packetPos.y - 0.25, packetPos.z + 0.15),
                piece.color,
              );
            }
          },
        });
      }

      if (connection.label) {
        const anchor = project({ ...mid, z: mid.z + 0.55 }, { scale: camera.scale, originX, originY });
        labelItems.push({ x: anchor.x, y: anchor.y, text: connection.label });
      }
    }

    for (const label of diagram.labels) {
      const anchor = project(label.position, { scale: camera.scale, originX, originY });
      labelItems.push({ x: anchor.x, y: anchor.y, text: label.text });
    }

    drawItems.sort((a, b) => b.depth - a.depth);
    for (const item of drawItems) item.run();

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = `${12 * camera.dpr}px ui-sans-serif, system-ui, sans-serif`;
      for (const item of labelItems) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
        ctx.fillText(item.text, item.x + camera.dpr, item.y + camera.dpr);
        ctx.fillStyle = item.dim ? "#94a3b8" : "#f8fafc";
        ctx.fillText(item.text, item.x, item.y);
      }
      ctx.restore();
    }
  }, [diagram, componentsById, camera, size]);

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onComponentClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) * camera.dpr;
    const clickY = (event.clientY - rect.top) * camera.dpr;

    let closestId: string | null = null;
    let closestDist = Infinity;
    for (const component of diagram.components) {
      const anchor = project(componentCenter(component), {
        scale: camera.scale,
        originX: originRef.current.originX,
        originY: originRef.current.originY,
      });
      const dist = Math.hypot(anchor.x - clickX, anchor.y - clickY);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = component.id;
      }
    }
    if (closestId && closestDist < camera.scale) onComponentClick(closestId);
  };

  return (
    <div ref={containerRef} className={cn("relative h-full min-h-[320px] w-full", className)}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={cn("h-full w-full", onComponentClick && "cursor-pointer")}
      />
    </div>
  );
}
