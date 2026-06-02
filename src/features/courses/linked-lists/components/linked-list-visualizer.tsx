"use client";

import { useEffect, useRef, useState } from "react";
import type { LLVisualVariant } from "../lib/linked-list-course";

// ---------------------------------------------------------------------------
// Palette — hardcoded so they work as SVG presentation-attribute values.
// SVG attrs do NOT resolve CSS custom properties; only style="" props do.
// ---------------------------------------------------------------------------
const C = {
  primary:     "#3b82f6",
  primaryBg:   "rgba(59,130,246,0.14)",
  primaryGlow: "rgba(59,130,246,0.55)",
  success:     "#34d399",
  successBg:   "rgba(52,211,153,0.13)",
  warn:        "#fbbf24",
  fg:          "rgba(255,255,255,0.88)",
  fgMuted:     "rgba(255,255,255,0.40)",
  border:      "rgba(255,255,255,0.14)",
  nodeBg:      "rgba(255,255,255,0.05)",
  dimBg:       "rgba(255,255,255,0.03)",
  dimStroke:   "rgba(255,255,255,0.09)",
  dimText:     "rgba(255,255,255,0.22)",
  rose:        "#f87171",
  transparent: "transparent",
} as const;

// ---------------------------------------------------------------------------
// Geometry constants
// NODE_W (value box) + PTR_W (next box) = TOTAL_W per node
// GAP between nodes = 28px → SLOT = 148px per node step
// ---------------------------------------------------------------------------
const NODE_W  = 88;
const NODE_H  = 52;
const PTR_W   = 32;
const TOTAL_W = NODE_W + PTR_W; // 120
const GAP     = 28;
const SLOT    = TOTAL_W + GAP;  // 148   ← always use SLOT for node x-spacing

// x-origin for node i
const nx = (i: number) => i * SLOT;

// centre-y of the node rect at a given top-y
const midY = (y: number) => y + NODE_H / 2;

// right-edge of a node (where arrow starts)
const rightX = (x: number) => x + TOTAL_W;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Arrowhead marker — must be inlined into the same SVG that uses it */
function AH({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <marker id={id} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
        <path d="M 0 0.5 L 0 6.5 L 6.5 3.5 Z" style={{ fill: color }} />
      </marker>
    </defs>
  );
}

type NodeTone = "default" | "active" | "found" | "dim";

interface NodeRectProps {
  x: number; y: number; value: string;
  tone?: NodeTone;
  label?: string;
  animDelay?: number;
}

function NodeRect({ x, y, value, tone = "default", label, animDelay = 0 }: NodeRectProps) {
  const isActive = tone === "active";
  const isFound  = tone === "found";
  const isDim    = tone === "dim";

  const stroke = isActive ? C.primary : isFound ? C.success : isDim ? C.dimStroke : C.border;
  const bg     = isActive ? C.primaryBg : isFound ? C.successBg : isDim ? C.dimBg : C.nodeBg;
  const color  = isActive ? C.primary : isFound ? C.success : isDim ? C.dimText : C.fg;

  const cx = x + TOTAL_W / 2;
  const cy = midY(y);

  return (
    <g
      className="ll-node-in"
      style={{ opacity: isDim ? 0.42 : 1, animationDelay: `${animDelay}ms` }}
    >
      {/* pulsing glow ring for active/found nodes */}
      {(isActive || isFound) && (
        <circle
          cx={cx} cy={cy} r={7}
          className="ll-pulse"
          style={{ fill: isActive ? C.primaryGlow : "rgba(52,211,153,0.45)", stroke: "none" }}
        />
      )}

      <rect
        x={x} y={y} width={TOTAL_W} height={NODE_H} rx={10} ry={10}
        style={{
          fill: bg, stroke, strokeWidth: isActive || isFound ? 2 : 1.5,
          filter: isActive
            ? `drop-shadow(0 0 8px ${C.primaryGlow})`
            : isFound
              ? "drop-shadow(0 0 8px rgba(52,211,153,0.4))"
              : undefined,
        }}
      />
      {/* divider */}
      <line
        x1={x + NODE_W} y1={y + 5} x2={x + NODE_W} y2={y + NODE_H - 5}
        style={{ stroke, strokeWidth: 1, opacity: 0.55 }}
      />
      {/* value */}
      <text
        x={x + NODE_W / 2} y={midY(y) + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={14} fontWeight={600}
        style={{ fill: color }}
      >
        {value}
      </text>
      {/* "next" label */}
      <text
        x={x + NODE_W + PTR_W / 2} y={midY(y) + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={9}
        style={{ fill: C.fgMuted }}
      >
        next
      </text>
      {/* above label e.g. HEAD */}
      {label && (
        <text
          x={x + NODE_W / 2} y={y - 11}
          textAnchor="middle" fontSize={10} fontWeight={700} letterSpacing={1}
          style={{ fill: C.primary }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

interface StraightArrowProps {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  color?: string;
  dim?: boolean;
  dashed?: boolean;
}

/** Generic straight arrow between any two points */
function StraightArrow({ id, x1, y1, x2, y2, color, dim, dashed }: StraightArrowProps) {
  const c = color ?? C.fgMuted;
  return (
    <g style={{ opacity: dim ? 0.22 : 1 }}>
      <AH id={id} color={c} />
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        markerEnd={`url(#${id})`}
        style={{
          stroke: c, strokeWidth: 1.6,
          strokeDasharray: dashed ? "5 3" : undefined,
        }}
      />
    </g>
  );
}

/** Horizontal arrow from the right edge of node at (fromNodeX, rowY) to
 *  the left edge of node at (toNodeX, rowY) */
function HArrow({
  id, fromNodeX, toNodeX, rowY, color, dim,
}: {
  id: string; fromNodeX: number; toNodeX: number; rowY: number;
  color?: string; dim?: boolean;
}) {
  return (
    <StraightArrow
      id={id}
      x1={rightX(fromNodeX) + 2} y1={midY(rowY)}
      x2={toNodeX - 4}            y2={midY(rowY)}
      color={color} dim={dim}
    />
  );
}

/** Arc arrow that curves upward between two points at the same y */
function ArcArrow({
  id, x1, x2, y, lift = 32, color, dashed,
}: {
  id: string; x1: number; x2: number; y: number;
  lift?: number; color?: string; dashed?: boolean;
}) {
  const c = color ?? C.success;
  const mx = (x1 + x2) / 2;
  return (
    <g>
      <AH id={id} color={c} />
      <path
        d={`M ${x1} ${y} Q ${mx} ${y - lift} ${x2} ${y}`}
        fill="none"
        markerEnd={`url(#${id})`}
        style={{
          stroke: c, strokeWidth: 1.7,
          strokeDasharray: dashed ? "5 3" : undefined,
        }}
      />
    </g>
  );
}

function CursorRing({ x, y }: { x: number; y: number }) {
  return (
    <rect
      x={x - 5} y={y - 5} width={TOTAL_W + 10} height={NODE_H + 10} rx={15}
      style={{
        fill: C.transparent,
        stroke: C.primary,
        strokeWidth: 2,
        opacity: 0.75,
        filter: `drop-shadow(0 0 7px ${C.primaryGlow})`,
      }}
    />
  );
}

function NullTerm({ x, y }: { x: number; y: number }) {
  return (
    <text x={x} y={midY(y) + 1} dominantBaseline="middle"
      fontSize={12} fontWeight={600}
      style={{ fill: C.fgMuted, opacity: 0.6 }}>
      null
    </text>
  );
}

function Cap({ cx, y, text }: { cx: number; y: number; text: string }) {
  return (
    <text x={cx} y={y} textAnchor="middle" fontSize={11}
      style={{ fill: C.fgMuted }}>
      {text}
    </text>
  );
}

// ===========================================================================
// Scene 1 — single-node
// ===========================================================================
function SceneSingleNode() {
  return (
    <svg viewBox="0 0 300 148" aria-label="A single linked list node">
      <NodeRect x={90} y={48} value="42" tone="active" />
      <Cap cx={150} y={130} text="A node — holds one value, one next pointer" />
    </svg>
  );
}

// ===========================================================================
// Scene 2 — node-with-pointer
// ===========================================================================
function SceneNodeWithPointer() {
  return (
    <svg viewBox="0 0 360 148" aria-label="Node with pointer arrow">
      <NodeRect x={30} y={48} value="42" tone="active" />
      <AH id="nwp" color={C.primary} />
      <line
        x1={rightX(30) + 2} y1={midY(48)}
        x2={272}             y2={midY(48)}
        markerEnd="url(#nwp)"
        className="ll-draw-on"
        style={{ stroke: C.primary, strokeWidth: 1.8 }}
      />
      <text x={278} y={midY(48) + 1} dominantBaseline="middle"
        fontSize={12} fontWeight={600}
        style={{ fill: C.fgMuted, opacity: 0.65 }}>
        next
      </text>
      <Cap cx={175} y={130} text="The pointer leads to the next node" />
    </svg>
  );
}

// ===========================================================================
// Scene 3 — chain-building (phase drives how many nodes are visible)
// ===========================================================================
const CHAIN_VALS = ["12", "37", "5", "89"];

function SceneChainBuilding({ phase = 0 }: { phase?: number }) {
  const count = Math.min(phase + 2, CHAIN_VALS.length);
  const viewW = count * SLOT + 40;
  const rowY  = 52;
  return (
    <svg viewBox={`0 0 ${viewW} 140`} aria-label="Chain building node by node">
      {CHAIN_VALS.slice(0, count).map((val, i) => (
        <g key={i}>
          <NodeRect x={nx(i)} y={rowY} value={val}
            tone={i === count - 1 ? "active" : "default"}
            animDelay={i * 80} />
          {i < count - 1 && (
            <HArrow id={`cb${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)} rowY={rowY} />
          )}
        </g>
      ))}
      <Cap cx={viewW / 2} y={132} text="Each new node links onto the chain" />
    </svg>
  );
}

// ===========================================================================
// Scene 4 — chain-with-head
// ===========================================================================
function SceneChainWithHead() {
  const vals  = ["12", "37", "5", "89"];
  const rowY  = 68;
  const viewW = vals.length * SLOT + 40;
  return (
    <svg viewBox={`0 0 ${viewW} 168`} aria-label="Linked list with HEAD label">
      {vals.map((v, i) => (
        <g key={i}>
          <NodeRect x={nx(i)} y={rowY} value={v}
            tone={i === 0 ? "active" : "default"}
            label={i === 0 ? "HEAD" : undefined}
            animDelay={i * 80} />
          {i < vals.length - 1 && (
            <HArrow id={`ch${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)} rowY={rowY} />
          )}
        </g>
      ))}
      <Cap cx={viewW / 2} y={160} text="HEAD is the only way into the list" />
    </svg>
  );
}

// ===========================================================================
// Scene 5 — chain-with-null
// ===========================================================================
function SceneChainWithNull() {
  const vals   = ["12", "37", "5", "89"];
  const rowY   = 68;
  // extra 80px on right for the null terminator
  const viewW  = vals.length * SLOT + 80;
  return (
    <svg viewBox={`0 0 ${viewW} 168`} aria-label="Linked list with null terminator">
      {vals.map((v, i) => {
        const isLast = i === vals.length - 1;
        return (
          <g key={i}>
            <NodeRect x={nx(i)} y={rowY} value={v}
              tone={i === 0 ? "active" : isLast ? "dim" : "default"}
              label={i === 0 ? "HEAD" : undefined} />
            {!isLast ? (
              <HArrow id={`cn${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)} rowY={rowY} />
            ) : (
              /* last node → null: arrow to the right, then null label */
              <>
                <StraightArrow
                  id={`cn${i}`}
                  x1={rightX(nx(i)) + 2} y1={midY(rowY)}
                  x2={nx(i) + TOTAL_W + 44} y2={midY(rowY)}
                  color={C.fgMuted}
                />
                <NullTerm x={nx(i) + TOTAL_W + 50} y={rowY} />
              </>
            )}
          </g>
        );
      })}
      <Cap cx={viewW / 2} y={160} text="null marks the end — no more nodes" />
    </svg>
  );
}

// ===========================================================================
// Scene 6 — chain-contrast (array vs linked list, side by side)
// Fixing the LL section: use SLOT spacing so arrows have room to breathe.
// ===========================================================================
function SceneChainContrast() {
  const arrVals = ["A", "B", "C", "D"];
  const llVals  = ["12", "37", "5", "89"];
  const rowY    = 140;
  // 4 nodes at SLOT=148 each → right edge = 3*148+120 = 564; add 40 padding
  const viewW   = 4 * SLOT + 40;  // 632
  return (
    <svg viewBox={`0 0 ${viewW} 252`} aria-label="Array vs linked list comparison">
      {/* ── Array section ── */}
      <text x={0} y={20} fontSize={11} fontWeight={700} letterSpacing={1}
        style={{ fill: C.primary }}>
        ARRAY — contiguous memory
      </text>
      {arrVals.map((v, i) => (
        <rect key={i}
          x={i * 60} y={28} width={54} height={42} rx={7}
          style={{ fill: C.primaryBg, stroke: C.primary, strokeWidth: 1.4 }} />
      ))}
      {arrVals.map((v, i) => (
        <text key={i}
          x={i * 60 + 27} y={49 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={13} fontWeight={600}
          style={{ fill: C.fg }}>{v}</text>
      ))}
      <text x={0} y={88} fontSize={10} style={{ fill: C.fgMuted }}>
        All slots are adjacent — address maths gives instant access (O(1))
      </text>

      {/* divider */}
      <line x1={0} x2={viewW - 10} y1={104} y2={104}
        style={{ stroke: C.border, strokeWidth: 1 }} />

      {/* ── Linked list section ── */}
      <text x={0} y={124} fontSize={11} fontWeight={700} letterSpacing={1}
        style={{ fill: C.success }}>
        LINKED LIST — scattered nodes
      </text>
      {llVals.map((v, i) => (
        <g key={i}>
          {/* SLOT=148 spacing → 28px gap for arrows — no overlap */}
          <NodeRect x={nx(i)} y={rowY} value={v} />
          {i < llVals.length - 1 && (
            <HArrow id={`cc${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)}
              rowY={rowY} color={C.success} />
          )}
        </g>
      ))}
      <text x={0} y={220} fontSize={10} style={{ fill: C.fgMuted }}>
        Nodes can live anywhere in memory — pointers stitch them together (O(n) to traverse)
      </text>
    </svg>
  );
}

// ===========================================================================
// Traversal scenes
// ===========================================================================
const TRAV = [
  { val: "7",  id: "t0" },
  { val: "23", id: "t1" },
  { val: "15", id: "t2" },
  { val: "37", id: "t3" },
  { val: "4",  id: "t4" },
];
const TRAV_ROW_Y = 54;
const TRAV_VIEW_W = TRAV.length * SLOT + 40; // 5*148+40 = 780

// ===========================================================================
// Scene 7 — traversal-idle
// ===========================================================================
function SceneTraversalIdle() {
  return (
    <svg viewBox={`0 0 ${TRAV_VIEW_W} 140`} aria-label="Five dim nodes — not yet visited">
      {TRAV.map((n, i) => (
        <g key={n.id}>
          <NodeRect x={nx(i)} y={TRAV_ROW_Y} value={n.val} tone="dim" />
          {i < TRAV.length - 1 && (
            <HArrow id={`ti${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)}
              rowY={TRAV_ROW_Y} dim />
          )}
        </g>
      ))}
      <Cap cx={TRAV_VIEW_W / 2} y={132} text="Searching for 37 — traversal not started" />
    </svg>
  );
}

// ===========================================================================
// Scene 8 — traversal-moving
// ===========================================================================
function SceneTraversalMoving({ phase = 0 }: { phase?: number }) {
  const cursor = phase === 0 ? 1 : 2;
  return (
    <svg viewBox={`0 0 ${TRAV_VIEW_W} 160`} aria-label="Cursor moving node by node">
      {TRAV.map((n, i) => (
        <g key={n.id}>
          <NodeRect x={nx(i)} y={TRAV_ROW_Y} value={n.val}
            tone={i === cursor ? "active" : i > cursor ? "dim" : "default"} />
          {i < TRAV.length - 1 && (
            <HArrow id={`tm${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)}
              rowY={TRAV_ROW_Y} dim={i >= cursor} />
          )}
        </g>
      ))}
      <CursorRing x={nx(cursor)} y={TRAV_ROW_Y} />
      {phase === 1 && (
        <text
          x={nx(cursor) + TOTAL_W / 2} y={TRAV_ROW_Y + NODE_H + 20}
          textAnchor="middle" fontSize={10}
          style={{ fill: C.fgMuted }}>
          {TRAV[cursor].val} ≠ 37 — follow pointer →
        </text>
      )}
    </svg>
  );
}

// ===========================================================================
// Scene 9 — traversal-found
// ===========================================================================
function SceneTraversalFound() {
  const found = 3;
  return (
    <svg viewBox={`0 0 ${TRAV_VIEW_W} 160`} aria-label="Node 4 found with value 37">
      {TRAV.map((n, i) => (
        <g key={n.id}>
          <NodeRect x={nx(i)} y={TRAV_ROW_Y} value={n.val}
            tone={i === found ? "found" : i > found ? "dim" : "default"} />
          {i < TRAV.length - 1 && (
            <HArrow id={`tf${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)}
              rowY={TRAV_ROW_Y} dim={i >= found} />
          )}
        </g>
      ))}
      <text
        x={nx(found) + TOTAL_W / 2} y={TRAV_ROW_Y + NODE_H + 20}
        textAnchor="middle" fontSize={11} fontWeight={600}
        style={{ fill: C.success }}>
        ✓ Found after 4 hops
      </text>
    </svg>
  );
}

// ===========================================================================
// Scene 10 — traversal-cost (auto-animating step counter)
// ===========================================================================
function SceneTraversalCost() {
  const [step, setStep] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ref.current = setInterval(() =>
      setStep(s => (s >= TRAV.length - 1 ? 0 : s + 1)), 800);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);

  return (
    <svg viewBox={`0 0 ${TRAV_VIEW_W} 172`} aria-label="Step counter incrementing">
      {TRAV.map((n, i) => (
        <g key={n.id}>
          <NodeRect x={nx(i)} y={TRAV_ROW_Y} value={n.val}
            tone={i === step ? "active" : i > step ? "dim" : "default"} />
          {i < TRAV.length - 1 && (
            <HArrow id={`tc${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)}
              rowY={TRAV_ROW_Y} dim={i >= step} />
          )}
        </g>
      ))}
      <CursorRing x={nx(step)} y={TRAV_ROW_Y} />
      <text x={TRAV_VIEW_W / 2} y={148} textAnchor="middle"
        fontSize={15} fontWeight={700} style={{ fill: C.primary }}>
        Steps: {step + 1}
      </text>
      <text x={TRAV_VIEW_W / 2} y={166} textAnchor="middle"
        fontSize={10} style={{ fill: C.fgMuted }}>
        Worst case = n steps for n nodes → O(n)
      </text>
    </svg>
  );
}

// ===========================================================================
// Scene 11 — traversal-race
// Fixing the LL section: was using i*96 (< TOTAL_W=120 → nodes overlapped).
// Now using proper SLOT spacing for LL. Array uses compact cells on the left.
// Both sections share the same viewBox width.
// ===========================================================================
function SceneTraversalRace() {
  const arrVals = ["A", "B", "C", "D", "E"];
  // Array: small cells, each 48px wide, 6px gap → 5*54 = 270px, centred left
  const ARR_CELL = 48;
  const ARR_GAP  = 10;
  const ARR_STEP = ARR_CELL + ARR_GAP; // 58

  // LL: full SLOT (148) — 5 nodes → last right edge = 4*148+120 = 712
  const LL_VIEW_W = 5 * SLOT + 40;  // 780
  const LL_ROW_Y  = 118;

  return (
    <svg viewBox={`0 0 ${LL_VIEW_W} 214`} aria-label="Array O(1) vs linked list O(n)">
      {/* ── Array section ── */}
      <text x={0} y={18} fontSize={11} fontWeight={700}
        style={{ fill: C.primary }}>
        ARRAY — arr[3] direct jump
      </text>
      {arrVals.map((v, i) => (
        <rect key={i}
          x={i * ARR_STEP} y={26} width={ARR_CELL} height={38} rx={7}
          style={{
            fill: i === 3 ? C.primaryBg : C.nodeBg,
            stroke: i === 3 ? C.primary : C.border,
            strokeWidth: 1.4,
          }} />
      ))}
      {arrVals.map((v, i) => (
        <text key={i}
          x={i * ARR_STEP + ARR_CELL / 2} y={45 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={12} fontWeight={i === 3 ? 700 : 400}
          style={{ fill: i === 3 ? C.primary : C.fg }}>
          {v}
        </text>
      ))}
      <text x={LL_VIEW_W - 4} y={45} textAnchor="end"
        fontSize={13} fontWeight={700} style={{ fill: C.primary }}>
        O(1) ⚡
      </text>

      {/* divider */}
      <line x1={0} x2={LL_VIEW_W - 10} y1={80} y2={80}
        style={{ stroke: C.border, strokeWidth: 1, opacity: 0.4 }} />

      {/* ── LL section ── */}
      <text x={0} y={100} fontSize={11} fontWeight={700}
        style={{ fill: C.fgMuted }}>
        LINKED LIST — must walk 4 hops
      </text>
      {arrVals.map((v, i) => (
        <g key={i}>
          <NodeRect x={nx(i)} y={LL_ROW_Y} value={v}
            tone={i === 3 ? "found" : "default"} />
          {i < arrVals.length - 1 && (
            <HArrow id={`race${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)} rowY={LL_ROW_Y} />
          )}
        </g>
      ))}
      <text x={LL_VIEW_W - 4} y={LL_ROW_Y + NODE_H / 2 + 5} textAnchor="end"
        fontSize={13} fontWeight={700} style={{ fill: C.fgMuted }}>
        O(n) 🐢
      </text>
    </svg>
  );
}

// ===========================================================================
// Insertion / deletion scenes
// ===========================================================================
const INS_VALS = [
  { id: "A", val: "A" },
  { id: "B", val: "B" },
  { id: "C", val: "C" },
  { id: "D", val: "D" },
];
const INS_ROW_Y = 110;                       // main row y — leaves room above for X
const INS_VIEW_W = INS_VALS.length * SLOT + 60; // 652

// X node floats above, centred over the B→C gap (no horizontal room for X inline)
const X_NODE_X = nx(1) + SLOT / 2 - TOTAL_W / 2; // 162 — centred between B and C
const X_NODE_Y = 16;                              // above the main row, inside viewBox

// ===========================================================================
// Scene 12 — insertion-list
// ===========================================================================
function SceneInsertionList() {
  return (
    <svg viewBox={`0 0 ${INS_VIEW_W} 180`} aria-label="Four-node list A B C D">
      {INS_VALS.map((n, i) => (
        <g key={n.id}>
          <NodeRect x={nx(i)} y={INS_ROW_Y} value={n.val} />
          {i < INS_VALS.length - 1 && (
            <HArrow id={`il${i}`} fromNodeX={nx(i)} toNodeX={nx(i + 1)} rowY={INS_ROW_Y} />
          )}
        </g>
      ))}
      <Cap cx={INS_VIEW_W / 2} y={172} text="We will insert X between B and C" />
    </svg>
  );
}

// ===========================================================================
// Scene 13 — insertion-animate
// X floats above the row at a fixed position (within viewBox).
// Phases: 0 = X appears  1 = X→C drawn  2 = B→X drawn  3 = label update
// No CSS transform sliding — avoids SVG clipping bugs.
// ===========================================================================
function SceneInsertionAnimate() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (phase >= 3) return;
    const t = setTimeout(() => setPhase(p => p + 1), 950);
    return () => clearTimeout(t);
  }, [phase]);

  // Arrow endpoints
  const xNodeMidY = midY(X_NODE_Y);               // 42
  const rowMidY   = midY(INS_ROW_Y);              // 136

  // X→C: from right edge of X node to left of C
  const xc_x1 = rightX(X_NODE_X) + 2;             // 284
  const xc_y1 = xNodeMidY;
  const xc_x2 = nx(2) - 4;                         // 292
  const xc_y2 = rowMidY;

  // B→X: from right edge of B to left of X node
  const bx_x1 = rightX(nx(1)) + 2;                // 270
  const bx_y1 = rowMidY;
  const bx_x2 = X_NODE_X - 4;                      // 158
  const bx_y2 = xNodeMidY;

  const caption =
    phase === 0 ? "X appears above the list"
    : phase === 1 ? "X's next pointer aims at C"
    : phase === 2 ? "B's pointer redirects to X"
    : "Two pointer changes — X is in the chain";

  return (
    <svg viewBox={`0 0 ${INS_VIEW_W} 192`} aria-label="Inserting node X between B and C">
      {/* X node — always at top, phase 0+ */}
      <NodeRect x={X_NODE_X} y={X_NODE_Y} value="X"
        tone={phase >= 1 ? "active" : "default"} />

      {/* X→C diagonal arrow (phase 1+) */}
      {phase >= 1 && (
        <StraightArrow id="ins-xc"
          x1={xc_x1} y1={xc_y1} x2={xc_x2} y2={xc_y2}
          color={C.primary} dashed />
      )}

      {/* B→X diagonal arrow (phase 2+) */}
      {phase >= 2 && (
        <StraightArrow id="ins-bx"
          x1={bx_x1} y1={bx_y1} x2={bx_x2} y2={bx_y2}
          color={C.warn} />
      )}

      {/* Main row */}
      <NodeRect x={nx(0)} y={INS_ROW_Y} value="A" />
      <HArrow id="ins-ab" fromNodeX={nx(0)} toNodeX={nx(1)} rowY={INS_ROW_Y} />

      <NodeRect x={nx(1)} y={INS_ROW_Y} value="B"
        tone={phase >= 2 ? "active" : "default"} />

      {/* B→C only while B hasn't been redirected yet */}
      {phase < 2 && (
        <HArrow id="ins-bc" fromNodeX={nx(1)} toNodeX={nx(2)} rowY={INS_ROW_Y} />
      )}

      <NodeRect x={nx(2)} y={INS_ROW_Y} value="C" />
      <HArrow id="ins-cd" fromNodeX={nx(2)} toNodeX={nx(3)} rowY={INS_ROW_Y} />
      <NodeRect x={nx(3)} y={INS_ROW_Y} value="D" />

      <Cap cx={INS_VIEW_W / 2} y={184} text={caption} />
    </svg>
  );
}

// ===========================================================================
// Scene 14 — deletion-animate
// A→C "skip" uses a bezier arc that curves ABOVE B, so it doesn't clip
// through B's rect while B is still visible.
// ===========================================================================
function SceneDeletionAnimate() {
  const [phase, setPhase] = useState(0);
  // phase 0: normal  1: B struck + fading  2: B gone
  useEffect(() => {
    if (phase >= 2) return;
    const t = setTimeout(() => setPhase(p => p + 1), 1000);
    return () => clearTimeout(t);
  }, [phase]);

  const rowY   = 72;
  const viewW  = INS_VALS.length * SLOT + 40; // 632

  const bOpacity = phase === 1 ? 0.22 : phase >= 2 ? 0 : 1;

  // A→C arc: starts at right edge of A, ends at left of C
  const arcX1 = rightX(nx(0)) + 2; // 122
  const arcX2 = nx(2) - 4;          // 292
  const arcY  = midY(rowY);         // 98
  const arcMx = (arcX1 + arcX2) / 2; // 207

  const caption =
    phase === 0 ? "A → B → C → D"
    : phase === 1 ? "B is struck — A's pointer is being redirected"
    : "B is gone — A points directly to C";

  return (
    <svg viewBox={`0 0 ${viewW} 172`} aria-label="Deleting node B">
      {/* A */}
      <NodeRect x={nx(0)} y={rowY} value="A"
        tone={phase >= 1 ? "active" : "default"} />

      {/* B — fades out */}
      <g style={{ opacity: bOpacity, transition: "opacity 0.55s ease" }}>
        <NodeRect x={nx(1)} y={rowY} value="B" />
        {/* strike-through on B when phase 1 */}
        {phase >= 1 && (
          <line
            x1={nx(1) + 8}           y1={rowY + 8}
            x2={nx(1) + TOTAL_W - 8} y2={rowY + NODE_H - 8}
            style={{ stroke: C.rose, strokeWidth: 2.2 }}
          />
        )}
      </g>

      {/* C, D */}
      <NodeRect x={nx(2)} y={rowY} value="C" />
      <NodeRect x={nx(3)} y={rowY} value="D" />
      <HArrow id="del-cd" fromNodeX={nx(2)} toNodeX={nx(3)} rowY={rowY} />

      {/* Phase 0: normal A→B and B→C arrows */}
      {phase === 0 && (
        <>
          <HArrow id="del-ab" fromNodeX={nx(0)} toNodeX={nx(1)} rowY={rowY} />
          <HArrow id="del-bc" fromNodeX={nx(1)} toNodeX={nx(2)} rowY={rowY} />
        </>
      )}

      {/* Phase 1+: A→C arc curves ABOVE B's rect so it doesn't collide */}
      {phase >= 1 && (
        <ArcArrow id="del-ac"
          x1={arcX1} x2={arcX2} y={arcY}
          lift={36}
          color={C.success}
        />
      )}

      <Cap cx={viewW / 2} y={162} text={caption} />
    </svg>
  );
}

// ===========================================================================
// Scene 15 — pointer-cost
// ===========================================================================
function ScenePointerCost() {
  return (
    // Increased height to 220 so the bottom text is not clipped
    <svg viewBox="0 0 500 222" aria-label="O(1) pointer swap vs O(n) traversal cost">
      <text x={0} y={20} fontSize={12} fontWeight={700}
        style={{ fill: C.success }}>
        Once you have the pointer — INSERT / DELETE
      </text>
      <rect x={0} y={28} width={240} height={40} rx={9}
        style={{ fill: C.successBg, stroke: C.success, strokeWidth: 1.3 }} />
      <text x={120} y={48 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={14} fontWeight={700}
        style={{ fill: C.success }}>
        O(1) — two pointer swaps
      </text>

      <line x1={0} x2={500} y1={84} y2={84}
        style={{ stroke: C.border, strokeWidth: 1, opacity: 0.35 }} />

      <text x={0} y={106} fontSize={12} fontWeight={700}
        style={{ fill: C.fgMuted }}>
        Finding the right position first
      </text>
      <rect x={0} y={114} width={240} height={40} rx={9}
        style={{ fill: C.nodeBg, stroke: C.border, strokeWidth: 1.3 }} />
      <text x={120} y={134 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={14} fontWeight={600}
        style={{ fill: C.fgMuted }}>
        O(n) — walk the chain
      </text>

      <line x1={0} x2={500} y1={170} y2={170}
        style={{ stroke: C.border, strokeWidth: 1, opacity: 0.35 }} />

      <text x={0} y={190} fontSize={10} style={{ fill: C.fgMuted }}>
        Total cost at an arbitrary position:
      </text>
      <text x={0} y={208} fontSize={10} style={{ fill: C.fgMuted }}>
        O(n) traversal to find it  +  O(1) pointer swap  =  O(n) overall
      </text>
    </svg>
  );
}

// ===========================================================================
// Scene dispatcher
// ===========================================================================
type SceneRenderer = (props: { phase?: number }) => React.ReactElement;

const SCENES: Record<string, SceneRenderer> = {
  "single-node":       () => <SceneSingleNode />,
  "node-with-pointer": () => <SceneNodeWithPointer />,
  "chain-building":    ({ phase }) => <SceneChainBuilding phase={phase} />,
  "chain-with-head":   () => <SceneChainWithHead />,
  "chain-with-null":   () => <SceneChainWithNull />,
  "chain-contrast":    () => <SceneChainContrast />,
  "traversal-idle":    () => <SceneTraversalIdle />,
  "traversal-moving":  ({ phase }) => <SceneTraversalMoving phase={phase} />,
  "traversal-found":   () => <SceneTraversalFound />,
  "traversal-cost":    () => <SceneTraversalCost />,
  "traversal-race":    () => <SceneTraversalRace />,
  "insertion-list":    () => <SceneInsertionList />,
  "insertion-animate": () => <SceneInsertionAnimate />,
  "deletion-animate":  () => <SceneDeletionAnimate />,
  "pointer-cost":      () => <ScenePointerCost />,
};

// ===========================================================================
// Public component
// ===========================================================================
interface LinkedListVisualizerProps {
  visual: LLVisualVariant;
}

export function LinkedListVisualizer({ visual }: LinkedListVisualizerProps) {
  const Scene = SCENES[visual.scene];
  if (!Scene) return null;

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .ll-draw-on { animation: none !important; stroke-dashoffset: 0 !important; }
          .ll-node-in { animation: none !important; opacity: 1 !important; }
          .ll-pulse { animation: none !important; }
          svg * { transition: none !important; }
        }

        /* draw-on line animation */
        .ll-draw-on {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: ll-draw 0.55s ease forwards;
        }
        @keyframes ll-draw { to { stroke-dashoffset: 0; } }

        /* node pop-in */
        .ll-node-in {
          animation: ll-node-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
        @keyframes ll-node-in {
          from { opacity: 0; transform: scale(0.82) translateY(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }

        /* pulsing glow ring on active node */
        .ll-pulse {
          animation: ll-pulse 1.8s ease-in-out infinite;
        }
        @keyframes ll-pulse {
          0%, 100% { opacity: 0.6; r: 7; }
          50%       { opacity: 0;   r: 14; }
        }

        /* scene fade-in */
        .ll-scene {
          animation: ll-fade 0.35s ease forwards;
        }
        @keyframes ll-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
      <div className="w-full overflow-x-auto">
        <div className="min-w-[280px] ll-scene">
          <Scene phase={visual.phase} />
        </div>
      </div>
    </>
  );
}
