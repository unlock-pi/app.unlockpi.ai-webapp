"use client";

import Isomer from "isomer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  byId,
  computeRoutes,
  pointAt,
  project,
  renderScene,
  unproject,
  LINKS,
  type LinkKind,
  type SceneNode,
  type SceneTheme,
  type TopoScene,
} from "@/features/topologies/lib/topology-kit";
import { cn } from "@/lib/utils";

type LinkRef = { a: string; b: string };

type Props = {
  scene: TopoScene;
  note?: string;
  /** True while a continuous "data is flowing" animation should run. */
  packetsAnimating?: boolean;
  onSelect?: (id: string) => void;
  /** A device was dragged to a new grid cell and dropped. */
  onMove?: (id: string, x: number, y: number) => void;
  /** Two devices were picked, in connect mode, with a link kind chosen. */
  onConnect?: (a: string, b: string, kind: LinkKind) => void;
  onDisconnect?: (a: string, b: string) => void;
  onSetLinkKind?: (a: string, b: string, kind: LinkKind) => void;
  className?: string;
};

const LIGHT_THEME: SceneTheme = { floor: "#BCC4CE", floorAlt: "#B3BCC7", zoneMix: 0.18, select: "#FFB020" };
const DARK_THEME: SceneTheme = { floor: "#3A4656", floorAlt: "#35404F", zoneMix: 0.22, select: "#FFB020" };
const DRAG_THRESHOLD_PX = 4;
const CONNECT_KINDS = Object.keys(LINKS) as LinkKind[];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Closest device to a screen point, within a generous grab radius — shared by click, drag-start, and connect-mode picking. */
function hitTestNode(iso: Isomer, mx: number, my: number, nodes: SceneNode[]): SceneNode | null {
  let best: SceneNode | null = null;
  let bestDist = Infinity;
  nodes.forEach((n) => {
    const comp = byId[n.type];
    if (!comp) return;
    const a = project(iso, n.x + 0.5, n.y + 0.5, 0);
    const b = project(iso, n.x + 0.5, n.y + 0.5, comp.h);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((mx - a.x) * dx + (my - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const dist = Math.hypot(mx - (a.x + dx * t), my - (a.y + dy * t));
    if (dist < bestDist) {
      bestDist = dist;
      best = n;
    }
  });
  return best && bestDist < iso.scale * 0.6 ? best : null;
}

/** Closest link to a screen point, tested against its actual traced (orthogonal) path. */
function hitTestLink(iso: Isomer, mx: number, my: number, scene: TopoScene): number | null {
  const routes = computeRoutes(scene);
  let best: number | null = null;
  let bestDist = Infinity;
  routes.forEach((pts, i) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const a = project(iso, pts[k][0], pts[k][1], 0.02);
      const b = project(iso, pts[k + 1][0], pts[k + 1][1], 0.02);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((mx - a.x) * dx + (my - a.y) * dy) / (dx * dx + dy * dy || 1)));
      const dist = Math.hypot(mx - (a.x + dx * t), my - (a.y + dy * t));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
  });
  return best !== null && bestDist < iso.scale * 0.16 ? best : null;
}

type PointerState = { mode: "idle" } | { mode: "node"; id: string; moved: boolean; startX: number; startY: number };

/**
 * Renders a TopoKit scene onto a canvas, matching the reference board's
 * camera-fit and floating labels, plus three interactions layered on top:
 * dragging a device (grid-snapped, with every touching link re-routed live),
 * a click-click "connect mode" for wiring two devices, and click-to-select a
 * link for deleting it or changing its kind.
 */
export function TopologyAgentBoard({
  scene,
  note,
  packetsAnimating = false,
  onSelect,
  onMove,
  onConnect,
  onDisconnect,
  onSetLinkKind,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isoRef = useRef<Isomer | null>(null);
  const pointerRef = useRef<PointerState>({ mode: "idle" });
  const [size, setSize] = useState({ width: 720, height: 440 });
  const [theme, setTheme] = useState<SceneTheme>(LIGHT_THEME);
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; y: number } | null>(null);

  const [connectMode, setConnectMode] = useState(false);
  const [connectKind, setConnectKind] = useState<LinkKind>("ethernet");
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<LinkRef | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setTheme(mq.matches ? DARK_THEME : LIGHT_THEME);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  const isEmpty = scene.nodes.length === 0;

  // The scene actually drawn: identical to the authored one, except the
  // dragged node's position tracks the pointer so every link touching it
  // visibly re-routes before the drag is ever committed.
  const renderableScene = useMemo<TopoScene>(() => {
    if (!dragPreview) return scene;
    return {
      ...scene,
      nodes: scene.nodes.map((n) => (n.id === dragPreview.id ? { ...n, x: dragPreview.x, y: dragPreview.y } : n)),
    };
  }, [scene, dragPreview]);

  const draw = useMemo(
    () => (time: number | null) => {
      const canvas = canvasRef.current;
      if (!canvas || size.width === 0) return;

      const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
      const W = size.width;
      const H = size.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;

      let maxH = 0;
      renderableScene.nodes.forEach((n) => {
        maxH = Math.max(maxH, byId[n.type]?.h ?? 0);
      });
      const span = renderableScene.w + renderableScene.d;
      const c = Math.cos(Math.PI / 6);
      const k = Math.min(W / (span * c * 1.08), H / ((span * 0.5 + maxH + 0.6) * 1.08));
      const camera = {
        scale: k * dpr,
        originX: (W / 2 - ((renderableScene.w - renderableScene.d) / 2) * k * c) * dpr,
        originY: (H / 2 + ((span / 2 + maxH + 0.6) * k) / 2 - 0.3 * k) * dpr,
      };

      const iso = new Isomer(canvas, camera);
      isoRef.current = iso;
      iso.canvas.clear();
      renderScene(iso, renderableScene, theme, time);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const ink = theme === DARK_THEME ? "#E4EAF1" : "#1C2B3A";
      const bg = theme === DARK_THEME ? "rgba(34,44,56,.9)" : "rgba(248,249,251,.9)";
      const fs = 11.5 * dpr;
      ctx.font = `600 ${fs}px Archivo, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const pill = (x: number, y: number, txt: string, fillColor = bg, textColor = ink) => {
        const w = ctx.measureText(txt).width + 12 * dpr;
        const h = fs + 8 * dpr;
        ctx.fillStyle = fillColor;
        roundRect(ctx, x - w / 2, y - h / 2, w, h, 5 * dpr);
        ctx.fill();
        ctx.fillStyle = textColor;
        ctx.fillText(txt, x, y + 0.5 * dpr);
      };

      const items = [...renderableScene.nodes].sort((a, b) => b.x + b.y - (a.x + a.y));
      items.forEach((n) => {
        const comp = byId[n.type];
        if (!comp) return;
        const txt = n.label || comp.name;
        const p = project(iso, n.x + 0.5, n.y + 0.5, comp.h + 0.22);
        pill(p.x, p.y, txt);
      });

      // Link labels, floating over the midpoint of each link's traced path.
      const routes = computeRoutes(renderableScene);
      renderableScene.links.forEach((l, i) => {
        if (!l.label) return;
        const mid = pointAt(routes[i], 0.5);
        const p = project(iso, mid[0], mid[1], 0.12);
        const color = LINKS[l.kind]?.hex ?? ink;
        pill(p.x, p.y, l.label, bg, color);
      });

      // A thin highlight ring under the selected link's label anchor.
      if (selectedLink) {
        const idx = renderableScene.links.findIndex((l) => l.a === selectedLink.a && l.b === selectedLink.b);
        if (idx >= 0) {
          const mid = pointAt(routes[idx], 0.5);
          const p = project(iso, mid[0], mid[1], 0.02);
          ctx.strokeStyle = theme.select;
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 7 * dpr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    },
    [renderableScene, size, theme, selectedLink],
  );

  // Static draw whenever the scene, size, theme, or selection change.
  useEffect(() => {
    if (!packetsAnimating) draw(null);
  }, [draw, packetsAnimating]);

  // Continuous data-flow animation loop, only while enabled.
  useEffect(() => {
    if (!packetsAnimating) return;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      draw((performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw, packetsAnimating]);

  const toCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return { x: (clientX - rect.left) * dpr, y: (clientY - rect.top) * dpr };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const iso = isoRef.current;
    const point = toCanvasPoint(event.clientX, event.clientY);
    if (!iso || !point) return;

    const hitNode = hitTestNode(iso, point.x, point.y, renderableScene.nodes);

    if (connectMode) {
      if (!hitNode) return;
      if (!connectSource) {
        setConnectSource(hitNode.id);
      } else if (hitNode.id !== connectSource) {
        onConnect?.(connectSource, hitNode.id, connectKind);
        setConnectSource(null);
      }
      return;
    }

    if (hitNode) {
      pointerRef.current = { mode: "node", id: hitNode.id, moved: false, startX: event.clientX, startY: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }

    const linkIndex = hitTestLink(iso, point.x, point.y, renderableScene);
    if (linkIndex !== null) {
      const link = renderableScene.links[linkIndex];
      setSelectedLink(link.b ? { a: link.a, b: link.b } : null);
      return;
    }

    setSelectedLink(null);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const state = pointerRef.current;
    if (state.mode !== "node") return;
    const iso = isoRef.current;
    if (!iso) return;

    if (!state.moved) {
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      pointerRef.current = { ...state, moved: true };
    }

    const point = toCanvasPoint(event.clientX, event.clientY);
    if (!point) return;
    const grid = unproject(iso, point.x, point.y);
    const maxCell = Math.max(renderableScene.w, renderableScene.d) - 1;
    const gx = Math.min(Math.max(0, Math.round(grid.x - 0.5)), maxCell);
    const gy = Math.min(Math.max(0, Math.round(grid.y - 0.5)), maxCell);
    setDragPreview({ id: state.id, x: gx, y: gy });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const state = pointerRef.current;
    pointerRef.current = { mode: "idle" };
    if (state.mode !== "node") return;
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (state.moved) {
      const preview = dragPreview;
      setDragPreview(null);
      if (preview) onMove?.(preview.id, preview.x, preview.y);
    } else {
      onSelect?.(state.id);
    }
  };

  const selectedLinkNode = (id: string) => renderableScene.nodes.find((n) => n.id === id);

  return (
    <div className={cn("grid w-full gap-3", className)}>
      <div ref={containerRef} className="relative min-h-[22rem] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/10">
        {isEmpty ? (
          <div className="flex h-[22rem] items-center justify-center px-6 text-center">
            <p className="text-sm text-muted-foreground">
              No topology on the board. Say &ldquo;set up a star topology&rdquo; to start.
            </p>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={cn("h-[22rem] w-full touch-none", connectMode ? "cursor-crosshair" : "cursor-grab")}
            />

            <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/90 p-1.5 text-xs shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => {
                  setConnectMode((v) => !v);
                  setConnectSource(null);
                  setSelectedLink(null);
                }}
                className={cn(
                  "rounded-md px-2 py-1 font-medium transition",
                  connectMode ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                {connectMode ? (connectSource ? "Pick target…" : "Pick source…") : "Connect"}
              </button>
              {connectMode ? (
                <select
                  value={connectKind}
                  onChange={(e) => setConnectKind(e.target.value as LinkKind)}
                  className="rounded-md border border-border/60 bg-background px-1.5 py-1 text-xs"
                >
                  {CONNECT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {LINKS[k].name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {selectedLink ? (
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/90 p-1.5 text-xs shadow-sm backdrop-blur">
                <span className="px-1 text-muted-foreground">
                  {selectedLinkNode(selectedLink.a)?.label ?? selectedLink.a} → {selectedLinkNode(selectedLink.b)?.label ?? selectedLink.b}
                </span>
                <select
                  defaultValue={renderableScene.links.find((l) => l.a === selectedLink.a && l.b === selectedLink.b)?.kind}
                  onChange={(e) => onSetLinkKind?.(selectedLink.a, selectedLink.b, e.target.value as LinkKind)}
                  className="rounded-md border border-border/60 bg-background px-1.5 py-1 text-xs"
                >
                  {CONNECT_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {LINKS[k].name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    onDisconnect?.(selectedLink.a, selectedLink.b);
                    setSelectedLink(null);
                  }}
                  className="rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive hover:bg-destructive/20"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <div className="flex min-h-[1.5rem] items-center justify-center">
        <AnimatePresence mode="wait">
          {note ? (
            <motion.p
              key={note}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="text-center text-sm text-muted-foreground"
            >
              {note}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
