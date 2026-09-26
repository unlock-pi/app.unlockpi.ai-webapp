"use client";

import Isomer from "isomer";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { byId, project, renderScene, type SceneTheme, type TopoScene } from "@/features/topologies/lib/topology-kit";
import { cn } from "@/lib/utils";

type Props = {
  scene: TopoScene;
  note?: string;
  /** True while a continuous "packets traveling" animation should run. */
  packetsAnimating?: boolean;
  onSelect?: (id: string) => void;
  className?: string;
};

const LIGHT_THEME: SceneTheme = { floor: "#BCC4CE", floorAlt: "#B3BCC7", zoneMix: 0.18, select: "#FFB020" };
const DARK_THEME: SceneTheme = { floor: "#3A4656", floorAlt: "#35404F", zoneMix: 0.22, select: "#FFB020" };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Renders a TopoKit scene onto a canvas, matching the reference board:
 * the same camera-fit formula, the same floating labels, and click-to-select.
 */
export function TopologyAgentBoard({ scene, note, packetsAnimating = false, onSelect, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isoRef = useRef<Isomer | null>(null);
  const [size, setSize] = useState({ width: 720, height: 440 });
  const [theme, setTheme] = useState<SceneTheme>(LIGHT_THEME);

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
      scene.nodes.forEach((n) => {
        maxH = Math.max(maxH, byId[n.type]?.h ?? 0);
      });
      const span = scene.w + scene.d;
      const c = Math.cos(Math.PI / 6);
      const k = Math.min(W / (span * c * 1.08), H / ((span * 0.5 + maxH + 0.6) * 1.08));
      const camera = {
        scale: k * dpr,
        originX: (W / 2 - ((scene.w - scene.d) / 2) * k * c) * dpr,
        originY: (H / 2 + ((span / 2 + maxH + 0.6) * k) / 2 - 0.3 * k) * dpr,
      };

      const iso = new Isomer(canvas, camera);
      isoRef.current = iso;
      iso.canvas.clear();
      renderScene(iso, scene, theme, time);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const ink = theme === DARK_THEME ? "#E4EAF1" : "#1C2B3A";
      const bg = theme === DARK_THEME ? "rgba(34,44,56,.9)" : "rgba(248,249,251,.9)";
      const fs = 11.5 * dpr;
      ctx.font = `600 ${fs}px Archivo, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const items = [...scene.nodes].sort((a, b) => b.x + b.y - (a.x + a.y));
      items.forEach((n) => {
        const comp = byId[n.type];
        if (!comp) return;
        const txt = n.label || comp.name;
        const p = project(iso, n.x + 0.5, n.y + 0.5, comp.h + 0.22);
        const w = ctx.measureText(txt).width + 12 * dpr;
        const h = fs + 8 * dpr;
        ctx.fillStyle = bg;
        roundRect(ctx, p.x - w / 2, p.y - h / 2, w, h, 5 * dpr);
        ctx.fill();
        ctx.fillStyle = ink;
        ctx.fillText(txt, p.x, p.y + 0.5 * dpr);
      });
    },
    [scene, size, theme],
  );

  // Static draw whenever the scene, size, or theme change.
  useEffect(() => {
    if (!packetsAnimating) draw(null);
  }, [draw, packetsAnimating]);

  // Continuous packet animation loop, only while enabled.
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

  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelect) return;
    const canvas = canvasRef.current;
    const iso = isoRef.current;
    if (!canvas || !iso) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mx = (event.clientX - rect.left) * dpr;
    const my = (event.clientY - rect.top) * dpr;

    let best: (typeof scene.nodes)[number] | null = null;
    let bestDist = Infinity;
    scene.nodes.forEach((n) => {
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

    if (best && bestDist < iso.scale * 0.6) onSelect((best as (typeof scene.nodes)[number]).id);
  };

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
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            className={cn("h-[22rem] w-full", onSelect && "cursor-pointer")}
          />
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
