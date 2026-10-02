import {
  buildBfs,
  buildConnectedComponents,
  buildCycleDetection,
  buildDfs,
  buildDijkstra,
  buildFindPath,
  buildKruskal,
  buildPrim,
  buildTopologicalSort,
} from "./algorithms";
import {
  edgeIsDirected,
  graphNeighbors,
  graphNodeById,
  graphNodeMetrics,
} from "./model";
import type {
  GraphAlgorithmResult,
  GraphDisplayMode,
  GraphExecutionStatus,
  GraphEdge,
  GraphExecutionState,
  GraphModel,
  GraphNode,
  GraphOperationEvent,
  GraphOperationEventType,
  GraphOperationResult,
  GraphRuntimeState,
  GraphSelection,
  GraphViewState,
} from "./types";

export type CreateGraphInput = {
  id?: string;
  directed?: boolean;
  weighted?: boolean;
};

export type AddNodeInput = {
  id: string;
  label?: string;
  position: { x: number; y: number };
};

export type AddEdgeInput = {
  id?: string;
  source: string;
  target: string;
  directed?: boolean;
  weight?: number;
  label?: string;
};

export type UpdateNodeInput = {
  id: string;
  label?: string;
  position?: { x: number; y: number };
};

export type EdgeReference = {
  id?: string;
  source?: string;
  target?: string;
};

export type UpdateEdgeInput = EdgeReference & {
  weight?: number;
  directed?: boolean;
  label?: string;
};

export type GraphInspection = {
  id: string;
  directed: boolean;
  weighted: boolean;
  nodeCount: number;
  edgeCount: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type NodeInspection = {
  id: string;
  label: string;
  neighbors: GraphNode[];
  degree?: number;
  inDegree?: number;
  outDegree?: number;
};

export type EdgeInspection = {
  id: string;
  source: string;
  target: string;
  weight?: number;
  label?: string;
  directed: boolean;
};

const EMPTY_VIEW: GraphViewState = {
  selectedNodeId: null,
  selectedEdgeId: null,
  highlightedNodeIds: [],
  highlightedEdgeIds: [],
  activeNodeId: null,
  activeEdgeId: null,
  displayMode: "graph",
};

const EMPTY_EXECUTION: Required<
  Pick<GraphExecutionState, "status" | "currentStep" | "totalSteps">
> & GraphExecutionState = {
  status: "idle",
  currentStep: 0,
  totalSteps: 0,
  visitedNodeIds: [],
  visitedEdgeIds: [],
  traversalPath: [],
};

function fail<T>(summary: string, state?: GraphRuntimeState): GraphOperationResult<T> {
  return { ok: false, summary, error: summary, state };
}

function event(
  state: GraphRuntimeState,
  type: GraphOperationEventType,
  summary: string,
  elementId?: string,
): GraphOperationEvent {
  return { id: state.eventSequence + 1, type, summary, elementId };
}

function commit<T>(
  state: GraphRuntimeState,
  next: Omit<GraphRuntimeState, "events" | "eventSequence">,
  type: GraphOperationEventType,
  summary: string,
  data?: T,
  elementId?: string,
): GraphOperationResult<T> {
  const nextEvent = event(state, type, summary, elementId);
  return {
    ok: true,
    summary,
    data,
    state: {
      ...next,
      eventSequence: nextEvent.id,
      events: [...state.events, nextEvent].slice(-20),
    },
    event: nextEvent,
  };
}

function normalizeId(value: string) {
  return value.trim();
}

function nextEdgeId(graph: GraphModel) {
  let index = graph.edges.length + 1;
  while (graph.edges.some((edge) => edge.id === `e${index}`)) index++;
  return `e${index}`;
}

function edgeFor(graph: GraphModel, reference: EdgeReference) {
  if (reference.id) return graph.edges.find((edge) => edge.id === reference.id) ?? null;
  if (reference.source && reference.target) {
    return graph.edges.find(
      (edge) =>
        (edge.source === reference.source && edge.target === reference.target) ||
        (!edgeIsDirected(graph, edge) && edge.source === reference.target && edge.target === reference.source),
    ) ?? null;
  }
  return null;
}

function stateWith(
  state: GraphRuntimeState,
  graph = state.graph,
  view = state.view,
  execution = graph === state.graph ? state.execution : { ...EMPTY_EXECUTION },
): Omit<GraphRuntimeState, "events" | "eventSequence"> {
  return {
    graph,
    view: graph === state.graph ? view : { ...view, activeNodeId: null, activeEdgeId: null, highlightedNodeIds: [], highlightedEdgeIds: [] },
    execution,
  };
}

export function createGraph(input: CreateGraphInput = {}): GraphOperationResult<GraphRuntimeState> {
  const graph: GraphModel = {
    id: normalizeId(input.id ?? "graph") || "graph",
    directed: input.directed ?? true,
    weighted: input.weighted ?? false,
    nodes: [],
    edges: [],
  };
  const base = createGraphRuntimeState(graph);
  const created = event(base, "GRAPH_CREATED", "Created an empty graph.");
  const state = { ...base, eventSequence: created.id, events: [created] };
  return { ok: true, summary: created.summary, data: state, state, event: created };
}

export function createGraphRuntimeState(graph: GraphModel): GraphRuntimeState {
  return {
    graph,
    view: { ...EMPTY_VIEW },
    execution: { ...EMPTY_EXECUTION },
    events: [],
    eventSequence: 0,
  };
}

export function addNode(state: GraphRuntimeState, input: AddNodeInput): GraphOperationResult<GraphNode> {
  const id = normalizeId(input.id);
  if (!id) return fail("Node ID is required.", state);
  if (graphNodeById(state.graph, id)) return fail(`Node ${id} already exists.`, state);
  if (!Number.isFinite(input.position.x) || !Number.isFinite(input.position.y)) {
    return fail("Node position must contain finite x and y values.", state);
  }
  const node: GraphNode = { id, label: input.label?.trim() || id, position: input.position };
  return commit(
    state,
    stateWith(state, { ...state.graph, nodes: [...state.graph.nodes, node] }),
    "NODE_CREATED",
    `Node ${id} created.`,
    node,
    id,
  );
}

export function removeNode(state: GraphRuntimeState, requestedId: string): GraphOperationResult<GraphNode> {
  const id = normalizeId(requestedId);
  const node = graphNodeById(state.graph, id);
  if (!node) return fail(`Node ${id || "(empty)"} does not exist.`, state);
  const removedEdges = state.graph.edges.filter((edge) => edge.source === id || edge.target === id);
  const view = {
    ...state.view,
    selectedNodeId: state.view.selectedNodeId === id ? null : state.view.selectedNodeId,
    selectedEdgeId: removedEdges.some((edge) => edge.id === state.view.selectedEdgeId)
      ? null
      : state.view.selectedEdgeId,
    highlightedNodeIds: (state.view.highlightedNodeIds ?? []).filter((nodeId) => nodeId !== id),
    highlightedEdgeIds: (state.view.highlightedEdgeIds ?? []).filter(
      (edgeId) => !removedEdges.some((edge) => edge.id === edgeId),
    ),
  };
  return commit(
    state,
    stateWith(state, {
      ...state.graph,
      nodes: state.graph.nodes.filter((candidate) => candidate.id !== id),
      edges: state.graph.edges.filter((edge) => edge.source !== id && edge.target !== id),
    }, view),
    "NODE_REMOVED",
    `Node ${id} removed with ${removedEdges.length} connected edge${removedEdges.length === 1 ? "" : "s"}.`,
    node,
    id,
  );
}

export function addEdge(state: GraphRuntimeState, input: AddEdgeInput): GraphOperationResult<GraphEdge> {
  const source = normalizeId(input.source);
  const target = normalizeId(input.target);
  if (!graphNodeById(state.graph, source)) return fail(`Cannot create edge: node ${source || "(empty)"} does not exist.`, state);
  if (!graphNodeById(state.graph, target)) return fail(`Cannot create edge: node ${target || "(empty)"} does not exist.`, state);
  if (input.weight !== undefined && !Number.isFinite(input.weight)) return fail("Edge weight must be a finite number.", state);
  const id = normalizeId(input.id ?? "") || nextEdgeId(state.graph);
  if (state.graph.edges.some((edge) => edge.id === id)) return fail(`Edge ${id} already exists.`, state);
  const edge: GraphEdge = {
    id,
    source,
    target,
    directed: input.directed ?? state.graph.directed,
    weight: state.graph.weighted ? input.weight : undefined,
    label: input.label?.trim() || undefined,
  };
  return commit(
    state,
    stateWith(state, { ...state.graph, edges: [...state.graph.edges, edge] }),
    "EDGE_CREATED",
    `Edge ${source}${edge.directed ? " → " : " — "}${target} created.`,
    edge,
    id,
  );
}

export function removeEdge(state: GraphRuntimeState, reference: EdgeReference): GraphOperationResult<GraphEdge> {
  const edge = edgeFor(state.graph, reference);
  if (!edge) return fail("Edge does not exist. Provide an edge ID or source and target.", state);
  const view = {
    ...state.view,
    selectedEdgeId: state.view.selectedEdgeId === edge.id ? null : state.view.selectedEdgeId,
    highlightedEdgeIds: (state.view.highlightedEdgeIds ?? []).filter((id) => id !== edge.id),
  };
  return commit(
    state,
    stateWith(state, { ...state.graph, edges: state.graph.edges.filter((item) => item.id !== edge.id) }, view),
    "EDGE_REMOVED",
    `Edge ${edge.id} removed.`,
    edge,
    edge.id,
  );
}

export function updateNode(state: GraphRuntimeState, input: UpdateNodeInput): GraphOperationResult<GraphNode> {
  const id = normalizeId(input.id);
  const current = graphNodeById(state.graph, id);
  if (!current) return fail(`Node ${id || "(empty)"} does not exist.`, state);
  if (input.position && (!Number.isFinite(input.position.x) || !Number.isFinite(input.position.y))) {
    return fail("Node position must contain finite x and y values.", state);
  }
  const node: GraphNode = {
    ...current,
    label: input.label === undefined ? current.label : input.label.trim() || id,
    position: input.position ?? current.position,
  };
  return commit(
    state,
    stateWith(state, { ...state.graph, nodes: state.graph.nodes.map((item) => item.id === id ? node : item) }),
    "NODE_UPDATED",
    `Node ${id} updated.`,
    node,
    id,
  );
}

export function updateEdge(state: GraphRuntimeState, input: UpdateEdgeInput): GraphOperationResult<GraphEdge> {
  const current = edgeFor(state.graph, input);
  if (!current) return fail("Edge does not exist. Provide an edge ID or source and target.", state);
  if (input.weight !== undefined && !Number.isFinite(input.weight)) return fail("Edge weight must be a finite number.", state);
  const edge: GraphEdge = {
    ...current,
    weight: state.graph.weighted && input.weight !== undefined ? input.weight : current.weight,
    directed: input.directed ?? current.directed,
    label: input.label === undefined ? current.label : input.label.trim() || undefined,
  };
  return commit(
    state,
    stateWith(state, { ...state.graph, edges: state.graph.edges.map((item) => item.id === edge.id ? edge : item) }),
    "EDGE_UPDATED",
    `Edge ${edge.id} updated.`,
    edge,
    edge.id,
  );
}

export function inspectGraph(state: GraphRuntimeState): GraphOperationResult<GraphInspection> {
  const data: GraphInspection = {
    id: state.graph.id,
    directed: state.graph.directed,
    weighted: state.graph.weighted,
    nodeCount: state.graph.nodes.length,
    edgeCount: state.graph.edges.length,
    nodes: state.graph.nodes,
    edges: state.graph.edges,
  };
  return { ok: true, summary: `Graph has ${data.nodeCount} nodes and ${data.edgeCount} edges.`, data, state };
}

export function inspectNode(state: GraphRuntimeState, requestedId: string): GraphOperationResult<NodeInspection> {
  const id = normalizeId(requestedId);
  const node = graphNodeById(state.graph, id);
  if (!node) return fail(`Node ${id || "(empty)"} does not exist.`, state);
  const metrics = graphNodeMetrics(state.graph, id);
  return {
    ok: true,
    summary: `Inspected node ${id}.`,
    state,
    data: { id: node.id, label: node.label, neighbors: graphNeighbors(state.graph, id), ...metrics },
  };
}

export function inspectEdge(state: GraphRuntimeState, reference: EdgeReference): GraphOperationResult<EdgeInspection> {
  const edge = edgeFor(state.graph, reference);
  if (!edge) return fail("Edge does not exist. Provide an edge ID or source and target.", state);
  return {
    ok: true,
    summary: `Inspected edge ${edge.id}.`,
    state,
    data: { id: edge.id, source: edge.source, target: edge.target, weight: edge.weight, label: edge.label, directed: edgeIsDirected(state.graph, edge) },
  };
}

export function getNeighbors(state: GraphRuntimeState, nodeId: string): GraphOperationResult<GraphNode[]> {
  const node = graphNodeById(state.graph, normalizeId(nodeId));
  if (!node) return fail(`Node ${nodeId || "(empty)"} does not exist.`, state);
  const data = graphNeighbors(state.graph, node.id);
  return { ok: true, summary: `${node.id} has ${data.length} neighbor${data.length === 1 ? "" : "s"}.`, data, state };
}

export function getDegree(state: GraphRuntimeState, nodeId: string): GraphOperationResult<ReturnType<typeof graphNodeMetrics>> {
  const node = graphNodeById(state.graph, normalizeId(nodeId));
  if (!node) return fail(`Node ${nodeId || "(empty)"} does not exist.`, state);
  return { ok: true, summary: `Retrieved degree information for ${node.id}.`, data: graphNodeMetrics(state.graph, node.id), state };
}

export function selectGraphElement(state: GraphRuntimeState, selection: GraphSelection | null): GraphOperationResult<GraphSelection | null> {
  if (selection?.type === "node" && !graphNodeById(state.graph, selection.id)) return fail(`Node ${selection.id} does not exist.`, state);
  if (selection?.type === "edge" && !state.graph.edges.some((edge) => edge.id === selection.id)) return fail(`Edge ${selection.id} does not exist.`, state);
  const view = {
    ...state.view,
    selectedNodeId: selection?.type === "node" ? selection.id : null,
    selectedEdgeId: selection?.type === "edge" ? selection.id : null,
  };
  const type = selection?.type === "node" ? "NODE_SELECTED" : selection?.type === "edge" ? "EDGE_SELECTED" : "VISUAL_STATE_CLEARED";
  return commit(state, stateWith(state, state.graph, view), type, selection ? `${selection.type === "node" ? "Node" : "Edge"} ${selection.id} selected.` : "Selection cleared.", selection, selection?.id);
}

export function highlightGraphElements(state: GraphRuntimeState, input: { nodeIds?: string[]; edgeIds?: string[] }): GraphOperationResult<GraphViewState> {
  const nodeIds = [...new Set(input.nodeIds ?? [])];
  const edgeIds = [...new Set(input.edgeIds ?? [])];
  const missingNode = nodeIds.find((id) => !graphNodeById(state.graph, id));
  if (missingNode) return fail(`Node ${missingNode} does not exist.`, state);
  const missingEdge = edgeIds.find((id) => !state.graph.edges.some((edge) => edge.id === id));
  if (missingEdge) return fail(`Edge ${missingEdge} does not exist.`, state);
  const view = { ...state.view, highlightedNodeIds: nodeIds, highlightedEdgeIds: edgeIds };
  return commit(state, stateWith(state, state.graph, view), nodeIds.length ? "NODE_HIGHLIGHTED" : "EDGE_HIGHLIGHTED", "Graph elements highlighted.", view);
}

export function clearGraphVisualState(state: GraphRuntimeState): GraphOperationResult<GraphViewState> {
  const view = { ...EMPTY_VIEW, displayMode: state.view.displayMode ?? "graph" };
  const execution = { ...EMPTY_EXECUTION };
  return commit(state, stateWith(state, state.graph, view, execution), "VISUAL_STATE_CLEARED", "Visual state cleared.", view);
}

export function setGraphView(state: GraphRuntimeState, viewMode: GraphDisplayMode): GraphOperationResult<GraphDisplayMode> {
  const view = { ...state.view, displayMode: viewMode };
  return commit(state, stateWith(state, state.graph, view), "GRAPH_VIEW_CHANGED", `View changed to ${viewMode}.`, viewMode);
}

export function startGraphExecution(state: GraphRuntimeState, totalSteps = state.execution.totalSteps ?? 0): GraphOperationResult<GraphExecutionState> {
  if (state.execution.status === "complete" && state.execution.algorithmResult) {
    const next = algorithmExecution(state, state.execution.algorithmResult, 0, "running");
    return commit(state, next, "EXECUTION_STARTED", "Algorithm restarted.", next.execution);
  }
  const execution = { ...state.execution, status: "running" as const, totalSteps: Math.max(totalSteps, state.execution.currentStep ?? 0) };
  return commit(state, stateWith(state, state.graph, state.view, execution), "EXECUTION_STARTED", "Graph execution started.", execution);
}

export function stepGraphExecution(state: GraphRuntimeState, options: { auto?: boolean } = {}): GraphOperationResult<GraphExecutionState> {
  const steps = state.execution.algorithmSteps;
  const outcome = state.execution.algorithmResult;
  if (steps?.length && outcome) {
    const currentIndex = Math.max(0, (state.execution.currentStep ?? 1) - 1);
    const nextIndex = Math.min(currentIndex + 1, steps.length - 1);
    if (currentIndex === steps.length - 1) return fail("Algorithm execution is already complete.", state);
    const nextStatus: GraphExecutionStatus = nextIndex === steps.length - 1 ? "complete" : options.auto && state.execution.status === "running" ? "running" : "paused";
    const next = algorithmExecution(state, outcome, nextIndex, nextStatus);
    const step = next.execution.algorithmStep;
    return commit(state, next, "EXECUTION_STEP", step?.description ?? "Advanced algorithm execution.", next.execution, step?.currentNodeId ?? step?.currentEdgeId);
  }
  const currentStep = (state.execution.currentStep ?? 0) + 1;
  const totalSteps = Math.max(state.execution.totalSteps ?? 0, currentStep);
  const execution = { ...state.execution, currentStep, totalSteps, status: state.execution.status === "idle" ? "paused" as const : state.execution.status };
  return commit(state, stateWith(state, state.graph, state.view, execution), "EXECUTION_STEP", "Advanced generic execution to step " + currentStep + ".", execution);
}

export function pauseGraphExecution(state: GraphRuntimeState): GraphOperationResult<GraphExecutionState> {
  if (state.execution.status !== "running") return fail("Graph execution is not running.", state);
  const execution = { ...state.execution, status: "paused" as const };
  return commit(state, stateWith(state, state.graph, state.view, execution), "EXECUTION_PAUSED", "Graph execution paused.", execution);
}

export function resetGraphExecution(state: GraphRuntimeState): GraphOperationResult<GraphExecutionState> {
  const execution = { ...EMPTY_EXECUTION };
  const view = { ...state.view, activeNodeId: null, activeEdgeId: null, highlightedNodeIds: [], highlightedEdgeIds: [] };
  return commit(state, stateWith(state, state.graph, view, execution), "EXECUTION_RESET", "Graph execution reset.", execution);
}


function algorithmExecution(
  state: GraphRuntimeState,
  outcome: GraphAlgorithmResult,
  stepIndex: number,
  status: GraphExecutionStatus,
): Omit<GraphRuntimeState, "events" | "eventSequence"> {
  const step = outcome.steps[stepIndex];
  const pathNodeIds = step?.pathNodeIds ?? [];
  const pathEdgeIds = step?.pathEdgeIds ?? [];
  const acceptedEdgeIds = step?.acceptedEdgeIds ?? [];
  const rejectedEdgeIds = step?.rejectedEdgeIds ?? [];
  const view = {
    ...state.view,
    activeNodeId: step?.currentNodeId ?? null,
    activeEdgeId: step && ["traverse_edge", "relax_edge", "accept_edge", "reject_edge", "cycle_detected"].includes(step.type)
      ? step.currentEdgeId ?? step.traversedEdgeId ?? null
      : null,
    highlightedNodeIds: pathNodeIds,
    highlightedEdgeIds: pathEdgeIds.length ? pathEdgeIds : acceptedEdgeIds,
  };
  const execution: GraphExecutionState = {
    ...EMPTY_EXECUTION,
    status,
    currentStep: step ? stepIndex + 1 : 0,
    totalSteps: outcome.steps.length,
    algorithm: outcome.algorithm,
    algorithmSteps: outcome.steps,
    algorithmStep: step,
    algorithmResult: outcome,
    visitedNodeIds: step?.visitedNodeIds ?? [],
    visitedEdgeIds: step?.traversedEdgeId ? [step.traversedEdgeId] : [],
    traversalPath: pathNodeIds,
    discoveredNodeIds: step?.discoveredNodeIds ?? [],
    acceptedEdgeIds,
    rejectedEdgeIds,
    pathNodeIds,
    pathEdgeIds,
    componentByNodeId: step?.componentByNodeId,
    distances: step?.distances,
    indegrees: step?.indegrees,
    previousNodeIds: step?.previousNodeIds,
    queue: step?.queue,
    stack: step?.stack,
    output: step?.output,
  };
  return stateWith(state, state.graph, view, execution);
}

function queueAlgorithm(
  state: GraphRuntimeState,
  outcome: GraphAlgorithmResult,
): GraphOperationResult<GraphAlgorithmResult> {
  if (!outcome.steps.length) return fail(outcome.reason ?? outcome.summary, state);
  const next = algorithmExecution(state, outcome, 0, "running");
  return commit(
    state,
    next,
    "EXECUTION_STARTED",
    outcome.summary,
    outcome,
    next.execution.algorithmStep?.currentNodeId ?? next.execution.algorithmStep?.currentEdgeId,
  );
}

export function runBFS(state: GraphRuntimeState, input: { startNode: string }): GraphOperationResult<GraphAlgorithmResult> {
  return queueAlgorithm(state, buildBfs(state.graph, input));
}

export function runDFS(state: GraphRuntimeState, input: { startNode: string }): GraphOperationResult<GraphAlgorithmResult> {
  return queueAlgorithm(state, buildDfs(state.graph, input));
}

export function findPath(state: GraphRuntimeState, input: { source: string; target: string }): GraphOperationResult<GraphAlgorithmResult> {
  return queueAlgorithm(state, buildFindPath(state.graph, input));
}

export function detectCycle(state: GraphRuntimeState): GraphOperationResult<GraphAlgorithmResult> {
  return queueAlgorithm(state, buildCycleDetection(state.graph));
}

export function connectedComponents(state: GraphRuntimeState): GraphOperationResult<GraphAlgorithmResult> {
  return queueAlgorithm(state, buildConnectedComponents(state.graph));
}

export function topologicalSort(state: GraphRuntimeState): GraphOperationResult<GraphAlgorithmResult> {
  return queueAlgorithm(state, buildTopologicalSort(state.graph));
}

export function runDijkstra(state: GraphRuntimeState, input: { source: string; target?: string }): GraphOperationResult<GraphAlgorithmResult> {
  return queueAlgorithm(state, buildDijkstra(state.graph, input));
}

export function runPrim(state: GraphRuntimeState, input: { startNode: string }): GraphOperationResult<GraphAlgorithmResult> {
  return queueAlgorithm(state, buildPrim(state.graph, input));
}

export function runKruskal(state: GraphRuntimeState): GraphOperationResult<GraphAlgorithmResult> {
  return queueAlgorithm(state, buildKruskal(state.graph));
}

export function createGraphPlaygroundState(): GraphRuntimeState {
  return createGraphRuntimeState({
    id: "playground",
    directed: true,
    weighted: true,
    nodes: [
      { id: "A", label: "A", position: { x: 270, y: 175 } },
      { id: "B", label: "B", position: { x: 730, y: 175 } },
      { id: "C", label: "C", position: { x: 270, y: 405 } },
      { id: "D", label: "D", position: { x: 730, y: 405 } },
    ],
    edges: [
      { id: "e1", source: "A", target: "B", directed: true, weight: 1 },
      { id: "e2", source: "A", target: "C", directed: true, weight: 2 },
      { id: "e3", source: "B", target: "D", directed: true, weight: 3 },
      { id: "e4", source: "C", target: "D", directed: true, weight: 4 },
    ],
  });
}
