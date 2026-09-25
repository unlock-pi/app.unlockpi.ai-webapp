"use client";

import { motion, useReducedMotion } from "motion/react";
import { memo, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";

import type {
  Automaton,
  AutomatonExecution,
  AutomatonState,
  AutomatonTransition,
} from "@/components/automata/model";
export const TRANSITION_FLOW_DURATION_MS = 2_000;
export const TRANSITION_ARRIVAL_DELAY_MS = TRANSITION_FLOW_DURATION_MS;

type Point = { x: number; y: number };
type PlacedState = AutomatonState & Point & { radius: number };
type DrawnEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  transitionIds: string[];
  path: string;
  pipePath: string;
  tip: string;
  labelAt: Point;
};
type Diagram = { width: number; height: number; states: PlacedState[]; edges: DrawnEdge[] };

const LEVEL_GAP = 220;
const ROW_GAP = 150;
const SKY = "#0ea5e9";
const SKY_DARK = "#0284c7";

function normalize(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function arrowTip(at: Point, direction: Point) {
  const side = { x: -direction.y, y: direction.x };
  const back = { x: at.x - direction.x * 11, y: at.y - direction.y * 11 };
  return `${at.x},${at.y} ${back.x + side.x * 4.5},${back.y + side.y * 4.5} ${back.x - side.x * 4.5},${back.y - side.y * 4.5}`;
}

function stateLevels(automaton: Automaton) {
  const levels = new Map<string, number>();
  if (automaton.startState) levels.set(automaton.startState, 0);
  const queue = automaton.startState ? [automaton.startState] : [];

  for (let index = 0; index < queue.length; index++) {
    const from = queue[index];
    for (const transition of automaton.transitions) {
      if (transition.from !== from || levels.has(transition.to)) continue;
      levels.set(transition.to, (levels.get(from) ?? 0) + 1);
      queue.push(transition.to);
    }
  }

  const finalLevel = Math.max(0, ...levels.values()) + 1;
  for (const state of automaton.states) {
    if (!levels.has(state.id)) levels.set(state.id, finalLevel);
  }
  return levels;
}

function edgeGeometry(from: PlacedState, to: PlacedState, reciprocal: boolean) {
  if (from.id === to.id) {
    // The loop sits above its state, leaving the label and arrow outside the circle.
    const start = { x: from.x - 22, y: from.y - from.radius * 0.75 };
    const end = { x: from.x + 22, y: from.y - from.radius * 0.75 };
    const c1 = { x: from.x - 85, y: from.y - from.radius - 105 };
    const c2 = { x: from.x + 85, y: from.y - from.radius - 105 };
    const endDirection = normalize(end.x - c2.x, end.y - c2.y);
    const pipeEnd = {
      x: end.x - endDirection.x * 11,
      y: end.y - endDirection.y * 11,
    };
    return {
      path: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
      pipePath: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${pipeEnd.x} ${pipeEnd.y}`,
      tip: arrowTip(end, endDirection),
      labelAt: { x: from.x, y: from.y - from.radius - 76 },
    };
  }

  const vector = normalize(to.x - from.x, to.y - from.y);
  const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  if (reciprocal) {
    const normal = { x: -vector.y, y: vector.x };
    const control = { x: middle.x + normal.x * 58, y: middle.y + normal.y * 58 };
    const startDirection = normalize(control.x - from.x, control.y - from.y);
    const endDirection = normalize(to.x - control.x, to.y - control.y);
    const start = {
      x: from.x + startDirection.x * (from.radius + 2),
      y: from.y + startDirection.y * (from.radius + 2),
    };
    const end = {
      x: to.x - endDirection.x * (to.radius + 6),
      y: to.y - endDirection.y * (to.radius + 6),
    };
    const pipeEnd = {
      x: end.x - endDirection.x * 11,
      y: end.y - endDirection.y * 11,
    };
    return {
      path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
      pipePath: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${pipeEnd.x} ${pipeEnd.y}`,
      tip: arrowTip(end, endDirection),
      labelAt: { x: middle.x + normal.x * 32, y: middle.y + normal.y * 32 - 13 },
    };
  }

  const start = {
    x: from.x + vector.x * (from.radius + 2),
    y: from.y + vector.y * (from.radius + 2),
  };
  const end = {
    x: to.x - vector.x * (to.radius + 6),
    y: to.y - vector.y * (to.radius + 6),
  };
  const pipeEnd = {
    x: end.x - vector.x * 11,
    y: end.y - vector.y * 11,
  };
  return {
    path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
    pipePath: `M ${start.x} ${start.y} L ${pipeEnd.x} ${pipeEnd.y}`,
    tip: arrowTip(end, vector),
    labelAt: { x: middle.x, y: middle.y - 15 },
  };
}

function buildDiagram(automaton: Automaton): Diagram {
  const levels = stateLevels(automaton);
  const rows = new Map<number, AutomatonState[]>();
  for (const state of automaton.states) {
    const level = levels.get(state.id) ?? 0;
    rows.set(level, [...(rows.get(level) ?? []), state]);
  }

  const maxRows = Math.max(1, ...[...rows.values()].map((row) => row.length));
  const width = Math.max(390, (Math.max(0, ...levels.values()) + 1) * LEVEL_GAP + 80);
  const height = Math.max(340, (maxRows - 1) * ROW_GAP + 300);
  const states = [...rows.entries()].flatMap(([level, row]) =>
    row.map((state, index) => ({
      ...state,
      x: 145 + level * LEVEL_GAP,
      y: height / 2 + (index - (row.length - 1) / 2) * ROW_GAP,
      radius: Math.max(32, Math.min(46, 24 + state.label.length * 4)),
    })),
  );
  const byId = new Map(states.map((state) => [state.id, state]));
  const groups = new Map<string, AutomatonTransition[]>();
  for (const transition of automaton.transitions) {
    if (!byId.has(transition.from) || !byId.has(transition.to)) continue;
    const key = JSON.stringify([transition.from, transition.to]);
    groups.set(key, [...(groups.get(key) ?? []), transition]);
  }

  const edges = [...groups.entries()].map(([id, transitions]) => {
    const { from, to } = transitions[0];
    const geometry = edgeGeometry(
      byId.get(from)!,
      byId.get(to)!,
      from !== to && groups.has(JSON.stringify([to, from])),
    );
    return {
      id,
      from,
      to,
      label: [...new Set(transitions.flatMap((transition) => transition.symbols))].join(", "),
      transitionIds: transitions.map((transition) => transition.id),
      ...geometry,
    };
  });
  return { width, height, states, edges };
}

function stateStatus(state: AutomatonState, execution: AutomatonExecution) {
  if (execution.currentStates.includes(state.id)) return "active";
  if (execution.transitionPhase === "traveling" &&
      execution.steps.at(-1)?.fromStates.includes(state.id)) return "highlighted";
  if (state.status === "highlighted") return "highlighted";
  if (execution.visitedStates.includes(state.id) || state.status === "visited") return "visited";
  return "normal";
}

function edgeStatus(edge: DrawnEdge, execution: AutomatonExecution, automaton: Automaton) {
  if (edge.transitionIds.some((id) => execution.activeTransitions.includes(id))) return "active";
  const transitions = automaton.transitions.filter((transition) => edge.transitionIds.includes(transition.id));
  if (transitions.some((transition) => transition.status === "highlighted")) return "highlighted";
  if (transitions.some((transition) =>
    execution.visitedTransitions.includes(transition.id) || transition.status === "visited"
  )) return "visited";
  return "normal";
}

function statusColor(status: string) {
  if (status === "active") return SKY;
  if (status === "highlighted") return SKY_DARK;
  if (status === "visited") return "var(--muted-foreground)";
  return "var(--foreground)";
}

export type TransitionDiagramProps = {
  automaton: Automaton;
  execution: AutomatonExecution;
  /** The initial path progress for an active flow, from 0 through 1. */
  flowProgress?: number;
};

function TransitionDiagramView({ automaton, execution, flowProgress = 0 }: TransitionDiagramProps) {
  const diagram = useMemo(() => buildDiagram(automaton), [automaton]);
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 1 });
  const viewWidth = diagram.width / view.zoom;
  const viewHeight = diagram.height / view.zoom;
  const viewX = view.x + (diagram.width - viewWidth) / 2;
  const viewY = view.y + (diagram.height - viewHeight) / 2;
  const traveling = execution.transitionPhase === "traveling";

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    dragRef.current = { x: event.clientX, y: event.clientY, originX: view.x, originY: view.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setView((current) => ({
      ...current,
      x: drag.originX - (event.clientX - drag.x) * viewWidth / rect.width,
      y: drag.originY - (event.clientY - drag.y) * viewHeight / rect.height,
    }));
  };
  const onWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    setView((current) => ({
      ...current,
      zoom: Math.max(0.65, Math.min(2.5, current.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1))),
    }));
  };

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-[1.25rem] border border-border/65 bg-card sm:h-[30rem] lg:h-[34rem]" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgb(14 165 233 / 6%), transparent 55%)" }}>
      <svg
        ref={svgRef}
        role="img"
        aria-label={`${automaton.type.toUpperCase()} state diagram`}
        className="block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { dragRef.current = null; }}
        onPointerCancel={() => { dragRef.current = null; }}
        onDoubleClick={() => setView({ x: 0, y: 0, zoom: 1 })}
        onWheel={onWheel}
      >
        {diagram.edges.map((edge) => {
          const status = edgeStatus(edge, execution, automaton);
          const color = statusColor(status);
          const flowing = traveling && status === "active";
          const restingColor = flowing ? "var(--border)" : color;
          const pulseKey = `${execution.executionId}:${execution.stepIndex}:${edge.id}`;
          return (
            <g key={edge.id}>
              <path
                d={edge.path}
                fill="none"
                stroke={restingColor}
                strokeWidth={status === "active" ? 3 : status === "visited" ? 1.5 : 1.8}
                strokeLinecap="round"
                className="transition-[stroke,fill,stroke-width] duration-[260ms] ease-out motion-reduce:transition-none"
              />
              {flowing ? (
                <>
                  <path
                    d={edge.pipePath}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth={11}
                    strokeOpacity={0.45}
                    strokeLinecap="round"
                    className="transition-[stroke,fill,stroke-width] duration-[260ms] ease-out motion-reduce:transition-none"
                  />
                  <path
                    d={edge.pipePath}
                    fill="none"
                    stroke="var(--card)"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                </>
              ) : null}
              {flowing ? (
                <g key={pulseKey} className="pointer-events-none">
                  <motion.path
                    d={edge.path}
                    fill="none"
                    stroke={SKY}
                    strokeWidth={5.5}
                    strokeLinecap="round"
                    initial={{ pathLength: flowProgress }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: reduceMotion ? 0 : (1 - flowProgress) * TRANSITION_FLOW_DURATION_MS / 1_000,
                      ease: "linear",
                    }}
                  />
                </g>
              ) : null}
              <polygon
                points={edge.tip}
                fill={restingColor}
                className="transition-[stroke,fill,stroke-width] duration-[260ms] ease-out motion-reduce:transition-none"
              />
              {edge.label ? (
                <g transform={`translate(${edge.labelAt.x} ${edge.labelAt.y})`}>
                  <rect x={-Math.max(17, edge.label.length * 4.1 + 8)} y={-13}
                    width={Math.max(34, edge.label.length * 8.2 + 16)} height={24}
                    rx={7} fill="var(--card)" fillOpacity={0.94} />
                  <text textAnchor="middle" dominantBaseline="middle" fill={color}
                    fontSize={14} fontWeight={600} className="pointer-events-none [font-family:Arial,sans-serif]">{edge.label}</text>
                </g>
              ) : null}
            </g>
          );
        })}

        {diagram.states.map((state) => {
          const status = stateStatus(state, execution);
          const active = status === "active";
          const fill = active ? SKY : status === "highlighted" ? SKY_DARK : "var(--card)";
          const outline = active || status === "highlighted"
            ? fill : status === "visited" ? "var(--muted-foreground)" : "var(--border)";
          const text = active || status === "highlighted"
            ? "#fff" : status === "visited" ? "var(--muted-foreground)" : "var(--foreground)";
          return (
            <g key={state.id}>
              {automaton.startState === state.id ? (
                <g fill="none" stroke="var(--foreground)" strokeWidth={1.8}>
                  <path d={`M ${state.x - state.radius - 82} ${state.y} L ${state.x - state.radius - 8} ${state.y}`} />
                  <path d={`M ${state.x - state.radius - 17} ${state.y - 5} L ${state.x - state.radius - 8} ${state.y} L ${state.x - state.radius - 17} ${state.y + 5}`} />
                </g>
              ) : null}
              {active ? <circle cx={state.x} cy={state.y} r={state.radius + 8}
                fill="none" stroke={SKY} strokeOpacity={0.23} strokeWidth={5}
                className="origin-center animate-in fade-in zoom-in-90 duration-300 motion-reduce:animate-none" /> : null}
              <circle cx={state.x} cy={state.y} r={state.radius}
                fill={fill} stroke={outline} strokeWidth={active ? 3 : 2}
                className="transition-[stroke,fill,stroke-width] duration-[260ms] ease-out motion-reduce:transition-none" />
              {state.accepting ? <circle cx={state.x} cy={state.y}
                r={state.radius - 6} fill="none" stroke={active ? "#fff" : outline}
                strokeWidth={1.8} className="transition-[stroke,fill,stroke-width] duration-[260ms] ease-out motion-reduce:transition-none" /> : null}
              <text x={state.x} y={state.y} textAnchor="middle" dominantBaseline="middle"
                fill={text} fontSize={18} fontWeight={600}
                className="pointer-events-none [font-family:Arial,sans-serif]">{state.label}</text>
            </g>
          );
        })}
      </svg>
      {view.zoom !== 1 || view.x !== 0 || view.y !== 0 ? (
        <button type="button" className="absolute right-3 top-3 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-md transition-colors hover:bg-muted" onClick={() => setView({ x: 0, y: 0, zoom: 1 })}>
          Reset view
        </button>
      ) : null}
    </div>
  );
}

export const TransitionDiagram = memo(TransitionDiagramView);
