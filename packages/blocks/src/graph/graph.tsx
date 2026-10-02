"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";

import { useGraphAgentView, useGraphPresentationView } from "./agent-view-context";
import { reconcileGraphProps } from "./authoring";
import {
  GRAPH_VIEWPORT,
  edgeIsDirected,
  graphAdjacencyList,
  graphAdjacencyMatrix,
  graphEdgeText,
  graphNeighbors,
  graphNodeById,
  graphNodeMetrics,
  toGraphModel,
} from "./model";
import type {
  GraphBlockProps,
  GraphDisplayMode,
  GraphEdge,
  GraphExecutionState,
  GraphModel,
  GraphNode,
  GraphOperationEvent,
  GraphViewState,
} from "./types";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Point = { x: number; y: number };
type Selection = { nodeId: string | null; edgeId: string | null };
type GraphRendererProps = {
  graph: GraphModel;
  viewState: GraphViewState;
  execution?: GraphExecutionState | null;
  event?: GraphOperationEvent | null;
  onSelect: (selection: Selection) => void;
};

type EdgeGeometry = {
  path: string;
  reversePath: string;
  labelAt: Point;
};

const NODE_RADIUS = 34;
const EMPTY_VIEW: GraphViewState = {};
const GRAPH_EASE = [0.22, 1, 0.36, 1] as const;

function normalize(x: number, y: number): Point {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function edgeGeometry(
  edge: GraphEdge,
  source: GraphNode,
  target: GraphNode,
  hasReciprocal: boolean,
): EdgeGeometry {
  const from = source.position;
  const to = target.position;

  if (source.id === target.id) {
    const start = { x: from.x + NODE_RADIUS * 0.62, y: from.y - NODE_RADIUS * 0.65 };
    const end = { x: from.x - NODE_RADIUS * 0.62, y: from.y - NODE_RADIUS * 0.65 };
    return {
      path: `M ${start.x} ${start.y} C ${from.x + 100} ${from.y - 140}, ${from.x - 100} ${from.y - 140}, ${end.x} ${end.y}`,
      reversePath: `M ${end.x} ${end.y} C ${from.x - 100} ${from.y - 140}, ${from.x + 100} ${from.y - 140}, ${start.x} ${start.y}`,
      labelAt: { x: from.x, y: from.y - 118 },
    };
  }

  const vector = normalize(to.x - from.x, to.y - from.y);
  const start = {
    x: from.x + vector.x * (NODE_RADIUS + 2),
    y: from.y + vector.y * (NODE_RADIUS + 2),
  };
  const end = {
    x: to.x - vector.x * (NODE_RADIUS + 7),
    y: to.y - vector.y * (NODE_RADIUS + 7),
  };
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  if (hasReciprocal) {
    const normal = { x: -vector.y, y: vector.x };
    const side = edge.source.localeCompare(edge.target) < 0 ? -1 : 1;
    const control = {
      x: middle.x + normal.x * side * 56,
      y: middle.y + normal.y * side * 56,
    };
    return {
      path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`,
      reversePath: `M ${end.x} ${end.y} Q ${control.x} ${control.y} ${start.x} ${start.y}`,
      labelAt: {
        x: (start.x + 2 * control.x + end.x) / 4,
        y: (start.y + 2 * control.y + end.y) / 4 - 12,
      },
    };
  }

  return {
    path: `M ${start.x} ${start.y} Q ${middle.x} ${middle.y} ${end.x} ${end.y}`,
    reversePath: `M ${end.x} ${end.y} Q ${middle.x} ${middle.y} ${start.x} ${start.y}`,
    labelAt: { x: middle.x, y: middle.y - 14 },
  };
}

function nodeAppearance(
  id: string,
  viewState: GraphViewState,
  execution: GraphExecutionState | null | undefined,
) {
  if (viewState.activeNodeId === id && execution?.algorithmStep?.type === "discover_node") {
    return { fill: "var(--graph-accent)", stroke: "var(--graph-accent)", text: "var(--graph-accent-foreground)", width: 3.5 };
  }
  if (viewState.activeNodeId === id) {
    return { fill: "var(--graph-accent)", stroke: "var(--graph-accent)", text: "var(--graph-accent-foreground)", width: 3.5 };
  }
  if (viewState.selectedNodeId === id) {
    return { fill: "color-mix(in oklab, var(--graph-accent) 18%, var(--card))", stroke: "var(--graph-accent)", text: "var(--foreground)", width: 3 };
  }
  if (viewState.highlightedNodeIds?.includes(id)) {
    return { fill: "color-mix(in oklab, var(--graph-accent) 18%, var(--card))", stroke: "var(--graph-accent)", text: "var(--foreground)", width: 3 };
  }
  if (execution?.pathNodeIds?.includes(id)) {
    return { fill: "var(--graph-accent)", stroke: "var(--graph-accent)", text: "var(--graph-accent-foreground)", width: 3.5 };
  }
  if (execution?.discoveredNodeIds?.includes(id) && !execution.visitedNodeIds?.includes(id)) {
    return { fill: "var(--card)", stroke: "var(--graph-accent)", text: "var(--foreground)", width: 3 };
  }
  const component = execution?.componentByNodeId?.[id];
  if (component) {
    const accent = "var(--chart-" + ((component - 1) % 5 + 1) + ")";
    return { fill: "var(--card)", stroke: accent, text: "var(--foreground)", width: 3 };
  }
  if (execution?.visitedNodeIds?.includes(id)) {
    return { fill: "var(--muted)", stroke: "var(--muted-foreground)", text: "var(--muted-foreground)", width: 2 };
  }
  return { fill: "var(--card)", stroke: "var(--foreground)", text: "var(--foreground)", width: 2 };
}

function edgeAppearance(
  id: string,
  viewState: GraphViewState,
  execution: GraphExecutionState | null | undefined,
  componentId?: number,
) {
  if (viewState.selectedEdgeId === id) {
    return { color: "var(--graph-accent)", width: 3.5, opacity: 1 };
  }
  if (execution?.pathEdgeIds?.includes(id)) {
    return { color: "var(--graph-accent)", width: 4, opacity: 1 };
  }
  if (execution?.acceptedEdgeIds?.includes(id)) {
    return { color: "var(--graph-accent)", width: 3.5, opacity: 1 };
  }
  if (execution?.rejectedEdgeIds?.includes(id)) {
    return { color: "var(--muted-foreground)", width: 1.5, opacity: 0.35 };
  }
  if (viewState.activeEdgeId === id) {
    return execution?.algorithmStep?.type === "traverse_edge" || execution?.algorithmStep?.type === "relax_edge"
      ? { color: "var(--foreground)", width: 2, opacity: 0.9 }
      : { color: "var(--graph-accent)", width: 4.5, opacity: 1 };
  }
  if (viewState.highlightedEdgeIds?.includes(id)) {
    return { color: "var(--graph-accent)", width: 3.5, opacity: 1 };
  }
  if (execution?.visitedEdgeIds?.includes(id)) {
    return { color: "var(--muted-foreground)", width: 1.5, opacity: 0.55 };
  }
  if (componentId) {
    return { color: "var(--chart-" + ((componentId - 1) % 5 + 1) + ")", width: 2.6, opacity: 1 };
  }
  return { color: "var(--foreground)", width: 2, opacity: 0.9 };
}

/**
 * Domain-neutral SVG graph renderer. It receives only a GraphModel plus
 * transient visual state; it has no algorithm, agent, or Puck knowledge.
 */
export function GraphRenderer({
  graph,
  viewState,
  execution,
  onSelect,
}: GraphRendererProps) {
  const reduceMotion = useReducedMotion();
  const markerId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    x: number;
    y: number;
  } | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const [cameraGraphId, setCameraGraphId] = useState(graph.id);
  if (cameraGraphId !== graph.id) {
    setCameraGraphId(graph.id);
    setCamera({ x: 0, y: 0, zoom: 1 });
  }

  const nodesById = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const viewWidth = GRAPH_VIEWPORT.width / camera.zoom;
  const viewHeight = GRAPH_VIEWPORT.height / camera.zoom;
  const viewX = camera.x + (GRAPH_VIEWPORT.width - viewWidth) / 2;
  const viewY = camera.y + (GRAPH_VIEWPORT.height - viewHeight) / 2;

  const beginPan = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: camera.x,
      y: camera.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const pan = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    setCamera((current) => ({
      ...current,
      x: drag.x - ((event.clientX - drag.pointerX) * viewWidth) / rect.width,
      y: drag.y - ((event.clientY - drag.pointerY) * viewHeight) / rect.height,
    }));
  };

  const zoom = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    setCamera((current) => ({
      ...current,
      zoom: Math.max(0.65, Math.min(2.5, current.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1))),
    }));
  };

  return (
    <div className={cn(
      "canvas-graph-canvas relative w-full overflow-hidden rounded-xl border border-border bg-card",
      graph.nodes.length ? "h-[24rem] sm:h-[32rem] lg:h-[40rem]" : "h-64 border-dashed",
    )}>
      <svg
        ref={svgRef}
        role="img"
        aria-label="Graph diagram"
        className="block h-full w-full touch-none select-none"
        viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={beginPan}
        onPointerMove={pan}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerCancel={() => {
          dragRef.current = null;
        }}
        onWheel={zoom}
        onDoubleClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
      >
        <defs>
          <marker
            id={`graph-arrow-${markerId}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>
        <rect
          data-graph-background="true"
          x={viewX}
          y={viewY}
          width={viewWidth}
          height={viewHeight}
          fill="transparent"
          onClick={() => onSelect({ nodeId: null, edgeId: null })}
        />
        <AnimatePresence initial={false}>
        {graph.edges.map((edge) => {
          const source = nodesById.get(edge.source);
          const target = nodesById.get(edge.target);
          if (!source || !target) return null;
          const reciprocal = graph.edges.some(
            (candidate) =>
              candidate.id !== edge.id &&
              candidate.source === edge.target &&
              candidate.target === edge.source,
          );
          const geometry = edgeGeometry(edge, source, target, reciprocal);
          const sourceGroup = execution?.componentByNodeId?.[edge.source];
          const targetGroup = execution?.componentByNodeId?.[edge.target];
          const appearance = edgeAppearance(edge.id, viewState, execution, sourceGroup === targetGroup ? sourceGroup : undefined);
          const label = graphEdgeText(graph, edge);
          const directed = edgeIsDirected(graph, edge);
          const step = execution?.algorithmStep;
          const travelPath = step?.fromNodeId === edge.target && step?.toNodeId === edge.source
            ? geometry.reversePath
            : geometry.path;
          return (
            <motion.g
              key={edge.id}
              className="cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, ease: GRAPH_EASE }}
              role="button"
              tabIndex={0}
              aria-label={`${source.label} ${directed ? "to" : "connected to"} ${target.label}${label ? `, ${label}` : ""}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ nodeId: null, edgeId: edge.id });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect({ nodeId: null, edgeId: edge.id });
                }
              }}
            >
              <path d={geometry.path} fill="none" stroke="transparent" strokeWidth={20} />
              <motion.path
                data-graph-edge-body=""
                d={geometry.path}
                initial={{ pathLength: 0 }}
                animate={{ d: geometry.path, pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.7, ease: GRAPH_EASE }}
                fill="none"
                stroke={appearance.color}
                strokeWidth={appearance.width}
                strokeOpacity={appearance.opacity}
                strokeLinecap="round"
                markerEnd={directed ? `url(#graph-arrow-${markerId})` : undefined}
                className="transition-[stroke,stroke-width,stroke-opacity] duration-500 motion-reduce:transition-none"
              />
              <AnimatePresence initial={false}>
                {step?.currentEdgeId === edge.id && step.type === "traverse_edge" ? (
                  <motion.path
                    key={edge.id + "-" + execution?.currentStep}
                    d={travelPath}
                    pathLength={1}
                    fill="none"
                    stroke="var(--graph-accent)"
                    strokeWidth={Math.max(appearance.width, 4)}
                    strokeLinecap="round"
                    className="pointer-events-none canvas-graph-edge-trace"
                    initial={{ opacity: 0.45, pathLength: 0 }}
                    animate={{ opacity: 1, pathLength: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 1.25, ease: GRAPH_EASE }}
                  />
                ) : null}
              </AnimatePresence>
              {label ? (
                <motion.g
                  className="pointer-events-none"
                  initial={{ x: geometry.labelAt.x, y: geometry.labelAt.y, opacity: 0 }}
                  animate={{ x: geometry.labelAt.x, y: geometry.labelAt.y, opacity: 1 }}
                  transition={{ duration: reduceMotion ? 0 : 0.65, ease: GRAPH_EASE }}
                >
                  <rect
                    x={-Math.max(20, label.length * 4.6 + 10)}
                    y={-14}
                    width={Math.max(40, label.length * 9.2 + 20)}
                    height={26}
                    rx={8}
                    fill="var(--card)"
                    fillOpacity={0.94}
                    stroke={appearance.color}
                    strokeOpacity={viewState.selectedEdgeId === edge.id ? 0.9 : 0.58}
                    className="transition-[stroke,stroke-opacity] duration-500 motion-reduce:transition-none"
                  />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.text
                      key={label}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={appearance.color}
                      fontSize={14}
                      fontWeight={650}
                      className="transition-[fill] duration-500 motion-reduce:transition-none [font-family:var(--font-mono),ui-monospace,monospace]"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.26 }}
                    >
                      {label}
                    </motion.text>
                  </AnimatePresence>
                </motion.g>
              ) : null}
            </motion.g>
          );
        })}
        </AnimatePresence>
        <AnimatePresence initial={false}>
        {graph.nodes.map((node) => {
          const appearance = nodeAppearance(node.id, viewState, execution);
          return (
            <motion.g
              key={node.id}
              className="cursor-pointer"
              initial={{ x: node.position.x, y: node.position.y, opacity: 0, scale: 0.72 }}
              animate={{ x: node.position.x, y: node.position.y, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.72 }}
              transition={{ duration: reduceMotion ? 0 : 0.65, ease: GRAPH_EASE }}
              role="button"
              tabIndex={0}
              aria-label={`Node ${node.label}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ nodeId: node.id, edgeId: null });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect({ nodeId: node.id, edgeId: null });
                }
              }}
            >
              <circle r={NODE_RADIUS + 7} fill="transparent" />
              <AnimatePresence initial={false}>
                {viewState.activeNodeId === node.id ? (
                  <motion.circle
                    key={execution?.currentStep ?? "active"}
                    r={NODE_RADIUS + 5}
                    fill="none"
                    stroke="var(--graph-accent)"
                    strokeWidth={2}
                    className="pointer-events-none"
                    initial={{ opacity: 0.5, scale: 0.94 }}
                    animate={{ opacity: 0, scale: 1.25 }}
                    transition={{ duration: reduceMotion ? 0 : 0.85, ease: GRAPH_EASE }}
                  />
                ) : null}
              </AnimatePresence>
              <circle
                data-graph-node-body=""
                r={NODE_RADIUS}
                fill={appearance.fill}
                stroke={appearance.stroke}
                strokeWidth={appearance.width}
                className="transition-[fill,stroke,stroke-width] duration-500 motion-reduce:transition-none"
              />
              <AnimatePresence mode="wait" initial={false}>
                <motion.text
                  key={node.label}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={appearance.text}
                  fontSize={18}
                  fontWeight={700}
                  className="pointer-events-none [font-family:var(--font-canvas-heading),var(--font-system),sans-serif]"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: reduceMotion ? 0 : 0.3 }}
                >
                  {node.label}
                </motion.text>
              </AnimatePresence>
            </motion.g>
          );
        })}
        </AnimatePresence>
      </svg>
      {!graph.nodes.length ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-4 text-center text-sm text-muted-foreground">
          Add nodes in the inspector to start your graph.
        </div>
      ) : null}
      {camera.zoom !== 1 || camera.x !== 0 || camera.y !== 0 ? (
        <button
          type="button"
          className="canvas-graph-control absolute right-3 top-3 rounded-md border border-border bg-card/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
          onClick={() => setCamera({ x: 0, y: 0, zoom: 1 })}
        >
          Reset view
        </button>
      ) : null}
    </div>
  );
}

function ViewSwitcher({
  mode,
  onChange,
}: {
  mode: GraphDisplayMode;
  onChange: (mode: GraphDisplayMode) => void;
}) {
  const options: Array<{ id: GraphDisplayMode; label: string }> = [
    { id: "graph", label: "Graph" },
    { id: "list", label: "List" },
    { id: "matrix", label: "Matrix" },
  ];
  return (
    <div className="canvas-graph-control inline-flex rounded-lg border border-border bg-muted/55 p-0.5" role="tablist" aria-label="Graph representation">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={mode === option.id}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            mode === option.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AdjacencyList({ graph }: { graph: GraphModel }) {
  return (
    <div className="canvas-graph-representation rounded-xl border border-border bg-card p-4">
      <ul className="grid gap-2 font-mono text-sm text-foreground">
        {graphAdjacencyList(graph).map(({ node, neighbors }) => (
          <li key={node.id} className="flex flex-wrap gap-x-2 gap-y-1">
            <span className="font-bold">{node.label}</span>
            <span className="text-muted-foreground">{graph.directed ? "→" : "—"}</span>
            <span className="text-muted-foreground">
              {neighbors.length
                ? neighbors
                    .map(({ node: neighbor, edge }) => {
                      const text = graphEdgeText(graph, edge);
                      return text ? `${neighbor.label} (${text})` : neighbor.label;
                    })
                    .join(", ")
                : "∅"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdjacencyMatrix({ graph }: { graph: GraphModel }) {
  const matrix = graphAdjacencyMatrix(graph);
  return (
    <div className="canvas-graph-representation overflow-x-auto rounded-xl border border-border bg-card p-3">
      <table className="min-w-full border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th scope="col" className="p-1 text-muted-foreground" />
            {graph.nodes.map((node) => (
              <th key={node.id} scope="col" className="p-1 font-mono font-semibold text-foreground">
                {node.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr key={graph.nodes[rowIndex]?.id}>
              <th scope="row" className="p-1 font-mono font-semibold text-foreground">
                {graph.nodes[rowIndex]?.label}
              </th>
              {row.map((edges, columnIndex) => {
                const value = edges.length
                  ? graph.weighted
                    ? edges.map((edge) => edge.weight ?? 1).join(",")
                    : "1"
                  : "0";
                return (
                  <td
                    key={`${rowIndex}-${columnIndex}`}
                    className={cn(
                      "min-w-8 rounded-md p-1 font-mono",
                      edges.length ? "bg-primary/12 text-foreground" : "bg-muted/55 text-muted-foreground",
                    )}
                  >
                    {value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GraphInspector({ graph, selection }: { graph: GraphModel; selection: Selection }) {
  const selectedNode = selection.nodeId ? graphNodeById(graph, selection.nodeId) : null;
  const selectedEdge = selection.edgeId
    ? graph.edges.find((edge) => edge.id === selection.edgeId) ?? null
    : null;

  if (selectedNode) {
    const metrics = graphNodeMetrics(graph, selectedNode.id);
    const neighbors = graphNeighbors(graph, selectedNode.id);
    return (
      <aside className="canvas-graph-inspector" aria-label="Node inspector">
        <p className="canvas-graph-inspector-title">Node</p>
        <dl className="canvas-graph-inspector-grid">
          <div><dt>ID</dt><dd>{selectedNode.id}</dd></div>
          <div><dt>Label</dt><dd>{selectedNode.label}</dd></div>
          {"degree" in metrics ? <div><dt>Degree</dt><dd>{metrics.degree}</dd></div> : <><div><dt>In-degree</dt><dd>{metrics.inDegree}</dd></div><div><dt>Out-degree</dt><dd>{metrics.outDegree}</dd></div></>}
          <div className="canvas-graph-inspector-wide"><dt>Neighbors</dt><dd>{neighbors.length ? neighbors.map((node) => node.label).join(", ") : "∅"}</dd></div>
        </dl>
      </aside>
    );
  }

  if (selectedEdge) {
    const source = graphNodeById(graph, selectedEdge.source);
    const target = graphNodeById(graph, selectedEdge.target);
    return (
      <aside className="canvas-graph-inspector" aria-label="Edge inspector">
        <p className="canvas-graph-inspector-title">Edge</p>
        <dl className="canvas-graph-inspector-grid">
          <div><dt>Source</dt><dd>{source?.label ?? selectedEdge.source}</dd></div>
          <div><dt>Target</dt><dd>{target?.label ?? selectedEdge.target}</dd></div>
          <div><dt>Type</dt><dd>{edgeIsDirected(graph, selectedEdge) ? "Directed" : "Undirected"}</dd></div>
          {graph.weighted ? <div><dt>Weight</dt><dd>{selectedEdge.weight ?? "—"}</dd></div> : null}
          {selectedEdge.label ? <div className="canvas-graph-inspector-wide"><dt>Label</dt><dd>{selectedEdge.label}</dd></div> : null}
        </dl>
      </aside>
    );
  }

  return (
    <aside className="canvas-graph-inspector" aria-label="Graph inspector">
      <p className="canvas-graph-inspector-title">Graph</p>
      <dl className="canvas-graph-inspector-grid">
        <div><dt>Type</dt><dd>{graph.directed ? "Directed" : "Undirected"}</dd></div>
        <div><dt>Weights</dt><dd>{graph.weighted ? "Weighted" : "Unweighted"}</dd></div>
        <div><dt>Nodes</dt><dd>{graph.nodes.length}</dd></div>
        <div><dt>Edges</dt><dd>{graph.edges.length}</dd></div>
      </dl>
    </aside>
  );
}

type GraphBlockRenderProps = GraphBlockProps & { id: string };

/** Puck block that composes the generic renderer with local selection and views. */
export function GraphBlock(props: GraphBlockRenderProps) {
  const reduceMotion = useReducedMotion();
  const authored = useMemo(() => reconcileGraphProps(props), [props]);
  const graph = useMemo(
    () => toGraphModel({ ...authored, id: props.id }),
    [authored, props.id],
  );
  const runtime = useGraphAgentView(props.id);
  const presentationView = useGraphPresentationView(props.id);
  const authoredMode = authored.displayMode ?? "graph";
  const [localMode, setLocalMode] = useState({
    value: authoredMode,
    authoredMode,
  });
  const [localSelection, setLocalSelection] = useState<Selection>({
    nodeId: null,
    edgeId: null,
  });

  const agentView = runtime?.viewState ?? EMPTY_VIEW;
  const visualState: GraphViewState = {
    selectedNodeId: agentView.selectedNodeId ?? localSelection.nodeId,
    selectedEdgeId: agentView.selectedEdgeId ?? localSelection.edgeId,
    highlightedNodeIds: agentView.highlightedNodeIds ?? [],
    highlightedEdgeIds: agentView.highlightedEdgeIds ?? [],
    activeNodeId: agentView.activeNodeId ?? null,
    activeEdgeId: agentView.activeEdgeId ?? null,
  };
  const mode =
    agentView.displayMode ??
    presentationView?.mode ??
    (localMode.authoredMode === authoredMode ? localMode.value : authoredMode);
  const selection = {
    nodeId: visualState.selectedNodeId ?? null,
    edgeId: visualState.selectedEdgeId ?? null,
  };

  return (
    <section className="canvas-graph-block grid w-full min-w-0 gap-3" aria-label="Graph data structure">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewSwitcher
          mode={mode}
          onChange={(nextMode) => {
            presentationView?.setMode(nextMode);
            setLocalMode({ value: nextMode, authoredMode });
          }}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{graph.directed ? "Directed" : "Undirected"}</span>
          <span aria-hidden="true">·</span>
          <span>{graph.weighted ? "Weighted" : "Unweighted"}</span>
          {selection.nodeId || selection.edgeId ? (
            <button
              type="button"
              className="canvas-graph-control rounded-md px-2 py-1 text-foreground hover:bg-muted"
              onClick={() => setLocalSelection({ nodeId: null, edgeId: null })}
            >
              Clear selection
            </button>
          ) : null}
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          className="min-w-0"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: GRAPH_EASE }}
        >
          {mode === "graph" ? (
            <GraphRenderer
              graph={graph}
              viewState={visualState}
              execution={runtime?.execution}
              onSelect={setLocalSelection}
            />
          ) : mode === "list" ? (
            <AdjacencyList graph={graph} />
          ) : (
            <AdjacencyMatrix graph={graph} />
          )}
        </motion.div>
      </AnimatePresence>
      <GraphInspector graph={graph} selection={selection} />
    </section>
  );
}
