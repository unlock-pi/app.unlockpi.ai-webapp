"use client";

import { motion, useReducedMotion } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";

import type {
  Automaton,
  AutomatonExecution,
  AutomatonState,
  AutomatonTransition,
} from "@/packages/blocks/automata/model";
import { cn } from "@/lib/utils";
import type { AutomataConstructionView } from "@/features/automata-agent/construction/automata-construction-agent";
export const TRANSITION_FLOW_DURATION_MS = 2_000;
export const TRANSITION_ARRIVAL_DELAY_MS = TRANSITION_FLOW_DURATION_MS;

type Point = { x: number; y: number };
type PlacedState = AutomatonState &
  Point & {
    radius: number;
    displayLabel: string;
    loopDirection: -1 | 1;
  };
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
type Diagram = {
  width: number;
  height: number;
  states: PlacedState[];
  edges: DrawnEdge[];
};

const LEVEL_GAP = 220;
const ROW_GAP = 150;
const SKY = "#0ea5e9";
const SKY_DARK = "#0284c7";
const ACCEPT = "#16a34a"; // green-600
const ACCEPT_BG = "rgba(16,163,127,0.08)"; // subtle green halo
const REJECT = "#ef4444"; // red-500
const REJECT_BG = "rgba(239,68,68,0.06)"; // subtle red halo

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
    // Split loops around stacked states so they do not cross neighboring nodes.
    const direction = from.loopDirection;
    const start = {
      x: from.x - 22,
      y: from.y + direction * from.radius * 0.75,
    };
    const end = {
      x: from.x + 22,
      y: from.y + direction * from.radius * 0.75,
    };
    const c1 = {
      x: from.x - 85,
      y: from.y + direction * (from.radius + 105),
    };
    const c2 = {
      x: from.x + 85,
      y: from.y + direction * (from.radius + 105),
    };
    const endDirection = normalize(end.x - c2.x, end.y - c2.y);
    const pipeEnd = {
      x: end.x - endDirection.x * 11,
      y: end.y - endDirection.y * 11,
    };
    return {
      path: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
      pipePath: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${pipeEnd.x} ${pipeEnd.y}`,
      tip: arrowTip(end, endDirection),
      labelAt: {
        x: from.x,
        y: from.y + direction * (from.radius + 76),
      },
    };
  }

  const vector = normalize(to.x - from.x, to.y - from.y);
  const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  // Route a returning edge below the forward path. This also keeps a
  // long back-edge from cutting through states between its endpoints.
  const backward = to.x < from.x - 1;
  const sameColumnReciprocal = reciprocal && Math.abs(to.x - from.x) <= 1;
  if (backward || sameColumnReciprocal) {
    const normal = { x: -vector.y, y: vector.x };
    const side = backward ? (normal.y >= 0 ? 1 : -1) : 1;
    const span = Math.hypot(to.x - from.x, to.y - from.y);
    const bend = backward
      ? Math.min(250, Math.max(115, span * 0.58))
      : Math.min(145, Math.max(90, span * 0.45));
    const control = {
      x: middle.x + normal.x * side * bend,
      y: middle.y + normal.y * side * bend,
    };
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
      labelAt: {
        x: (start.x + 2 * control.x + end.x) / 4,
        y: (start.y + 2 * control.y + end.y) / 4 - 14,
      },
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

export function buildDiagram(automaton: Automaton, compactSpacing = false): Diagram {
  const levelGap = compactSpacing ? 170 : LEVEL_GAP;
  const levels = stateLevels(automaton);
  const rows = new Map<number, AutomatonState[]>();
  for (const state of automaton.states) {
    const level = levels.get(state.id) ?? 0;
    rows.set(level, [...(rows.get(level) ?? []), state]);
  }

  const maxRows = Math.max(1, ...[...rows.values()].map((row) => row.length));
  const width = Math.max(
    compactSpacing ? 350 : 390,
    (Math.max(0, ...levels.values()) + 1) * levelGap + 80,
  );
  const height = Math.max(340, (maxRows - 1) * ROW_GAP + 300);
  const displayIndexByStateId = new Map(
    automaton.states.map((state, index) => [state.id, index]),
  );
  const states = [...rows.entries()].flatMap(([level, row]) =>
    row.map<PlacedState>((state, index) => ({
      ...state,
      x: 145 + level * levelGap,
      y: height / 2 + (index - (row.length - 1) / 2) * ROW_GAP,
      // Diagram nodes always use formal q0/q1/q2 notation; descriptive labels
      // remain available in the model and transition table.
      displayLabel: `q${displayIndexByStateId.get(state.id) ?? index}`,
      radius: 38,
      loopDirection: row.length > 1 && index >= row.length / 2 ? 1 : -1,
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
      label: [
        ...new Set(transitions.flatMap((transition) => transition.symbols)),
      ].join(", "),
      transitionIds: transitions.map((transition) => transition.id),
      ...geometry,
    };
  });
  return { width, height, states, edges };
}

function stateStatus(state: AutomatonState, execution: AutomatonExecution) {
  if (execution.currentStates.includes(state.id)) return "active";
  if (
    execution.transitionPhase === "traveling" &&
    execution.steps.at(-1)?.fromStates.includes(state.id)
  )
    return "highlighted";
  if (state.status === "highlighted") return "highlighted";
  if (execution.visitedStates.includes(state.id) || state.status === "visited")
    return "visited";
  return "normal";
}

function edgeStatus(
  edge: DrawnEdge,
  execution: AutomatonExecution,
  automaton: Automaton,
) {
  // Keep completed NFA branches muted. `activeTransitions` records the last
  // mathematical move, but is visually active only while its signal travels.
  if (
    execution.transitionPhase === "traveling" &&
    edge.transitionIds.some((id) => execution.activeTransitions.includes(id))
  )
    return "active";
  const transitions = automaton.transitions.filter((transition) =>
    edge.transitionIds.includes(transition.id),
  );
  if (transitions.some((transition) => transition.status === "highlighted"))
    return "highlighted";
  if (
    transitions.some(
      (transition) =>
        execution.visitedTransitions.includes(transition.id) ||
        transition.status === "visited",
    )
  )
    return "visited";
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
  flowDurationMs?: number;
  construction?: AutomataConstructionView | null;
  onConstructionAnimationComplete?: (token: string) => void;
  /** Overrides the default standalone diagram height in embedded surfaces. */
  viewportClassName?: string;
  /** Reduces long horizontal gaps when a graph shares a lesson frame. */
  compactSpacing?: boolean;
};

function TransitionDiagramView({
  automaton,
  execution: suppliedExecution,
  flowProgress = 0,
  flowDurationMs = TRANSITION_FLOW_DURATION_MS,
  viewportClassName,
  compactSpacing = false,
  construction,
  onConstructionAnimationComplete,
}: TransitionDiagramProps) {
  const execution = construction?.execution ?? suppliedExecution;
  const diagram = useMemo(
    () => buildDiagram(automaton, compactSpacing),
    [automaton, compactSpacing],
  );
  const reduceMotion = useReducedMotion();
  const token = construction?.timeline.token;
  const action = construction?.timeline.steps[construction.timeline.currentStep]?.action;
  const constructionRunning = construction?.timeline.mode === "building";
  const defaultConstructionMs = action?.type === "create_transition" ? 1_150
    : action?.type === "create_state" ? 850
    : action?.type === "animate_transition" || action?.type === "execute_step" ? 2_000
    : 650;
  const constructionDuration = reduceMotion ? 0 : (construction?.timeline.steps[construction.timeline.currentStep]?.animationMs ?? defaultConstructionMs) / 1_000;
  const completedEdges = useRef<{ token: string | null; edges: Set<string> }>({ token: null, edges: new Set() });
  const acknowledgeEdge = (edgeId: string) => {
    if (action?.type !== "execute_step") { acknowledge(); return; }
    if (completedEdges.current.token !== token) completedEdges.current = { token: token ?? null, edges: new Set() };
    completedEdges.current.edges.add(edgeId);
    const expected = diagram.edges.filter((edge) => edge.transitionIds.some((id) => execution.activeTransitions.includes(id)));
    if (expected.every((edge) => completedEdges.current.edges.has(edge.id))) acknowledge();
  };
  const acknowledge = () => { if (token && constructionRunning) onConstructionAnimationComplete?.(token); };
  useEffect(() => {
    if (token && constructionRunning && action && (["explain", "pause", "complete"].includes(action.type) || (action.type === "execute_step" && !execution.activeTransitions.length))) onConstructionAnimationComplete?.(token);
  }, [token, constructionRunning, action, execution.activeTransitions.length, onConstructionAnimationComplete]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    originX: number;
    originY: number;
  } | null>(null);
  const topologyKey = useMemo(
    () =>
      JSON.stringify({
        id: automaton.id,
        type: automaton.type,
        startState: automaton.startState,
        states: automaton.states.map((state) => state.id),
        transitions: automaton.transitions.map((transition) => [
          transition.from,
          transition.to,
        ]),
      }),
    [automaton],
  );
  const [storedView, setView] = useState({
    x: 0,
    y: 0,
    zoom: 1,
    topologyKey,
  });
  const view =
    storedView.topologyKey === topologyKey
      ? storedView
      : { x: 0, y: 0, zoom: 1, topologyKey };

  const viewWidth = diagram.width / view.zoom;
  const viewHeight = diagram.height / view.zoom;
  const viewX = view.x + (diagram.width - viewWidth) / 2;
  const viewY = view.y + (diagram.height - viewHeight) / 2;
  const traveling = execution.transitionPhase === "traveling";
  // Determine final step and final-state highlights for accepted/rejected results
  const finalStep = execution.steps.at(-1);
  const finalAccepted = new Set<string>();
  const finalRejected = new Set<string>();
  if (finalStep && (execution.result === "accepted" || execution.result === "rejected")) {
    if (finalStep.result === "accepted") {
      for (const id of finalStep.toStates) finalAccepted.add(id);
      // fall back to any accepting states among currentStates
      if (finalAccepted.size === 0) for (const id of execution.currentStates) if (automaton.acceptStates.includes(id)) finalAccepted.add(id);
    }
    if (finalStep.result === "rejected") {
      // If there are no toStates (dead), mark the last fromStates as rejected; otherwise mark toStates.
      if (finalStep.toStates.length) for (const id of finalStep.toStates) finalRejected.add(id);
      else for (const id of finalStep.fromStates) finalRejected.add(id);
    }
  }

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      originX: view.x,
      originY: view.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setView({
      ...view,
      x: drag.originX - ((event.clientX - drag.x) * viewWidth) / rect.width,
      y: drag.originY - ((event.clientY - drag.y) * viewHeight) / rect.height,
    });
  };
  const onWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    setView({
      ...view,
      zoom: Math.max(
        0.65,
        Math.min(2.5, view.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1)),
      ),
    });
  };

  return (
    <div
      className={cn(
        "relative h-96 w-full overflow-hidden rounded-[1.25rem] border border-border/65 bg-card sm:h-[30rem] lg:h-[34rem]",
        viewportClassName,
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgb(14 165 233 / 6%), transparent 55%)",
      }}
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label={`${automaton.type.toUpperCase()} state diagram`}
        className="block h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onDoubleClick={() => setView({ x: 0, y: 0, zoom: 1, topologyKey })}
        onWheel={onWheel}
      >
        {diagram.edges.map((edge) => {
          if (construction && !edge.transitionIds.some((id) => construction.visibleTransitions.includes(id))) return null;
          const targeted = constructionRunning && action && (("transitionId" in action && edge.transitionIds.includes(action.transitionId)) || (action.type === "execute_step" && edge.transitionIds.some((id) => execution.activeTransitions.includes(id))));
          const status = construction?.execution ? edgeStatus(edge, execution, automaton) : construction ? construction.highlightedTransitions.some((id) => edge.transitionIds.includes(id)) ? "active" : "normal" : edgeStatus(edge, execution, automaton);
          const color = statusColor(status);
          const edgeFinalAccepted = finalAccepted.has(edge.to);
          const edgeFinalRejected = finalRejected.has(edge.to);
          const overrideEdgeColor = edgeFinalAccepted ? ACCEPT : edgeFinalRejected ? REJECT : undefined;
          const flowing = construction ? targeted && (action?.type === "animate_transition" || action?.type === "execute_step") && construction.timeline.animation === "running" : traveling && status === "active";
          const shownLabel = construction ? [...new Set(automaton.transitions.filter((transition) => edge.transitionIds.includes(transition.id) && construction.visibleTransitions.includes(transition.id)).flatMap((transition) => transition.symbols))].join(", ") : edge.label;
          const restingColor = flowing ? "var(--border)" : color;
          const creatingTransition = targeted && action?.type === "create_transition";
          const pulseKey = `${execution.executionId}:${execution.stepIndex}:${edge.id}`;
          return (
            <motion.g key={edge.id}
              initial={false} animate={{ opacity: 1 }}
              transition={{ duration: constructionDuration, ease: [0.22, 1, 0.36, 1] }}>
              {creatingTransition ? (
                <motion.path
                  key={token}
                  d={edge.path}
                  fill="none"
                  stroke={SKY}
                  strokeWidth={4}
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                  transition={{ duration: constructionDuration, ease: [0.45, 0, 0.25, 1] }}
                  onAnimationComplete={acknowledge}
                />
              ) : null}
              {targeted && action?.type === "highlight_transition" ? (
                <motion.path
                  key={token}
                  d={edge.path}
                  fill="none"
                  stroke={SKY}
                  strokeWidth={5}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: constructionDuration }}
                  onAnimationComplete={acknowledge}
                />
              ) : null}
              <motion.path
                initial={false}
                animate={{ pathLength: 1, opacity: creatingTransition ? 0 : 1 }}
                transition={{ duration: 0 }}
                d={edge.path}
                fill="none"
                stroke={overrideEdgeColor ?? restingColor}
                strokeWidth={
                  status === "active" ? 3 : status === "visited" ? 1.5 : 1.8
                }
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
                    stroke={edgeFinalAccepted ? ACCEPT : edgeFinalRejected ? REJECT : SKY}
                    strokeWidth={5.5}
                    strokeLinecap="round"
                    initial={{ pathLength: flowProgress }}
                    animate={{ pathLength: 1 }}
                    onAnimationComplete={construction && targeted && (action?.type === "animate_transition" || action?.type === "execute_step") ? () => acknowledgeEdge(edge.id) : undefined}
                    transition={{
                      duration: reduceMotion
                        ? 0
                        : ((1 - flowProgress) * (construction ? constructionDuration * 1_000 : flowDurationMs)) /
                          1_000,
                      ease: "linear",
                    }}
                  />
                </g>
              ) : null}
              <motion.polygon
                points={edge.tip}
                initial={false}
                animate={{ opacity: creatingTransition ? 0 : 1 }}
                transition={creatingTransition
                  ? { duration: reduceMotion ? 0 : 0.15, delay: reduceMotion ? 0 : Math.max(0, constructionDuration - 0.15) }
                  : { duration: 0 }}

                fill={overrideEdgeColor ?? restingColor}
                className="transition-[stroke,fill,stroke-width] duration-[260ms] ease-out motion-reduce:transition-none"
              />
              {shownLabel ? (
                <motion.g
                  initial={false}
                  animate={{ opacity: creatingTransition ? 0 : 1 }}
                  transition={creatingTransition
                    ? { duration: reduceMotion ? 0 : 0.15, delay: reduceMotion ? 0 : Math.max(0, constructionDuration - 0.15) }
                    : { duration: 0 }}
                  transform={`translate(${edge.labelAt.x} ${edge.labelAt.y})`}>
                  <rect
                    x={-Math.max(17, edge.label.length * 4.1 + 8)}
                    y={-13}
                    width={Math.max(34, edge.label.length * 8.2 + 16)}
                    height={24}
                    rx={7}
                    fill="var(--card)"
                    fillOpacity={0.94}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={overrideEdgeColor ?? color}
                    fontSize={14}
                    fontWeight={600}
                    className="pointer-events-none [font-family:Arial,sans-serif]"
                  >
                    {shownLabel}
                  </text>
                </motion.g>
              ) : null}
            </motion.g>
          );
        })}

        {diagram.states.map((state) => {
          if (construction && !construction.visibleStates.includes(state.id)) return null;
          const targeted = constructionRunning && action && "stateId" in action && action.stateId === state.id;
          const traversal = action?.type === "animate_transition" ? automaton.transitions.find((edge) => edge.id === action.transitionId) : undefined;
          const traversalState = traversal && (construction?.timeline.animation === "complete" ? traversal.to : traversal.from);
          const status = construction?.execution ? stateStatus(state, execution) : construction ? construction.highlightedStates.includes(state.id) || (constructionRunning && traversalState === state.id) ? "active" : "normal" : stateStatus(state, execution);
          const active = status === "active";
          // If we're rendering the final accepted/rejected result, prefer those styles.
          const isFinalAccepted = finalAccepted.has(state.id);
          const isFinalRejected = finalRejected.has(state.id);

          // Avoid blue fill during creation animations: keep creation-targeted states neutral.
          const creationNeutral = Boolean(
            targeted && constructionRunning && action?.type === "create_state",
          );

          const fill = creationNeutral
            ? "var(--card)"
            : isFinalAccepted
              ? "var(--card)"
              : isFinalRejected
                ? "var(--card)"
                : active
                  ? SKY
                  : status === "highlighted"
                    ? SKY_DARK
                    : "var(--card)";

          const outline = isFinalAccepted
            ? ACCEPT
            : isFinalRejected
              ? REJECT
              : creationNeutral
                ? "var(--border)"
                : active || status === "highlighted"
                  ? fill
                  : status === "visited"
                    ? "var(--muted-foreground)"
                    : "var(--border)";

          const text = isFinalAccepted || isFinalRejected
            ? "#111827"
            : active || status === "highlighted"
              ? "#fff"
              : status === "visited"
                ? "var(--muted-foreground)"
                : "var(--foreground)";
          return (
            <motion.g key={state.id}
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              style={{ transformOrigin: `${state.x}px ${state.y}px` }}
              transition={{ duration: constructionDuration, ease: [0.22, 1, 0.36, 1] }}>
              {targeted && action?.type === "create_state" ? (
                <motion.path
                  key={token}
                  d={`M ${state.x + state.radius + 5} ${state.y} a ${state.radius + 5} ${state.radius + 5} 0 1 0 ${-2 * (state.radius + 5)} 0 a ${state.radius + 5} ${state.radius + 5} 0 1 0 ${2 * (state.radius + 5)} 0`}
                  fill="none"
                  stroke={SKY}
                  strokeWidth={4}
                  initial={{ opacity: 0, scale: 0.86 }}
                  animate={{ opacity: [0, 1, 0], scale: 1.08 }}
                  style={{ transformOrigin: `${state.x}px ${state.y}px` }}
                  transition={{ duration: constructionDuration, ease: [0.22, 1, 0.36, 1] }}
                  onAnimationComplete={acknowledge}
                />
              ) : null}
              {targeted && action?.type === "highlight_state" ? (
                <motion.circle
                  key={token}
                  cx={state.x}
                  cy={state.y}
                  r={state.radius + 7}
                  fill="none"
                  stroke={SKY}
                  strokeWidth={4}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: constructionDuration }}
                  onAnimationComplete={acknowledge}
                />
              ) : null}
              {(construction ? construction.initialState : automaton.startState) === state.id ? (
                <g fill="none" stroke="var(--foreground)" strokeWidth={1.8}>
                  <motion.path
                    initial={targeted && action?.type === "set_initial_state" ? { pathLength: 0 } : false}
                    animate={{ pathLength: 1 }} transition={{ duration: constructionDuration, ease: [0.45, 0, 0.25, 1] }}
                    d={`M  ${state.y} L ${state.x - state.radius - 8} ${state.y}`}
                  />
                  <motion.path
                    initial={targeted && action?.type === "set_initial_state" ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={targeted && action?.type === "set_initial_state"
                      ? { duration: reduceMotion ? 0 : 0.18, delay: reduceMotion ? 0 : Math.max(0, constructionDuration - 0.18) }
                      : { duration: 0 }}
                    onAnimationComplete={targeted && action?.type === "set_initial_state" ? acknowledge : undefined}
                    d={`M ${state.x - state.radius - 17} ${state.y - 5} L ${state.x - state.radius - 8} ${state.y} L ${state.x - state.radius - 17} ${state.y + 5}`}
                  />
                </g>
              ) : null}
              <circle
                cx={state.x}
                cy={state.y}
                r={state.radius}
                fill={fill}
                stroke={outline}
                strokeWidth={active ? 3 : 2}
                className="transition-[stroke,fill,stroke-width] duration-[260ms] ease-out motion-reduce:transition-none"
              />
              {(isFinalAccepted || isFinalRejected) ? (
                <circle
                  cx={state.x}
                  cy={state.y}
                  r={state.radius + 10}
                  fill={isFinalAccepted ? ACCEPT_BG : REJECT_BG}
                  className="transition-[opacity] duration-[320ms] ease-out motion-reduce:transition-none"
                />
              ) : null}

              {(construction ? construction.acceptingStates.includes(state.id) : state.accepting) ? (
                <motion.circle
                  initial={targeted && action?.type === "set_accepting_state" ? { pathLength: 0 } : false}
                  animate={{ pathLength: 1 }} transition={{ duration: constructionDuration, ease: [0.45, 0, 0.25, 1] }}
                  onAnimationComplete={targeted && action?.type === "set_accepting_state" ? acknowledge : undefined}
                  cx={state.x}
                  cy={state.y}
                  r={state.radius - 6}
                  fill="none"
                  stroke={active ? "#fff" : outline}
                  strokeWidth={1.8}
                  className="transition-[stroke,fill,stroke-width] duration-[260ms] ease-out motion-reduce:transition-none"
                />
              ) : null}
              <text
                x={state.x}
                y={state.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={text}
                fontSize={18}
                fontWeight={600}
                className="pointer-events-none [font-family:Arial,sans-serif]"
              >
                {state.displayLabel}
              </text>
            </motion.g>
          );
        })}
      </svg>
      {view.zoom !== 1 || view.x !== 0 || view.y !== 0 ? (
        <button
          type="button"
          className="absolute right-3 top-3 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-md transition-colors hover:bg-muted"
          onClick={() => setView({ x: 0, y: 0, zoom: 1, topologyKey })}
        >
          Reset view
        </button>
      ) : null}
    </div>
  );
}

export const TransitionDiagram = memo(TransitionDiagramView);
