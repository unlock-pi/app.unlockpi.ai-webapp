/** Pure graph domain types. None of these depend on React or Puck. */
export type GraphPosition = {
  x: number;
  y: number;
};

export type GraphNode = {
  id: string;
  label: string;
  position: GraphPosition;
  metadata?: Record<string, string>;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  /** Resolved per-edge direction. It falls back to the graph default in authoring. */
  directed: boolean;
  weight?: number;
  label?: string;
};

/** Renderer-independent graph structure used by algorithms and views alike. */
export type GraphModel = {
  id: string;
  directed: boolean;
  weighted: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type GraphDisplayMode = "graph" | "list" | "matrix";
export type GraphView = GraphDisplayMode;
export type GraphDirection = "directed" | "undirected";
export type GraphWeight = "weighted" | "unweighted";

export type GraphSelection =
  | { type: "node"; id: string }
  | { type: "edge"; id: string };

export type GraphHighlight = {
  nodeIds: string[];
  edgeIds: string[];
};

export type GraphExecutionStatus = "idle" | "running" | "paused" | "complete";

export type GraphAlgorithmName =
  | "bfs" | "dfs" | "find_path" | "detect_cycle" | "connected_components"
  | "topological_sort" | "dijkstra" | "prim" | "kruskal";

export type GraphAlgorithmStepType =
  | "initialize" | "discover_node" | "visit_node" | "traverse_edge" | "backtrack"
  | "relax_edge" | "accept_edge" | "reject_edge" | "component_started"
  | "enqueue_node" | "dequeue_node" | "complete" | "cycle_detected";

/** A renderer-neutral, serializable snapshot for one algorithm beat. */
export type GraphAlgorithmStep = {
  index: number;
  type: GraphAlgorithmStepType;
  description: string;
  currentNodeId?: string;
  currentEdgeId?: string;
  traversedEdgeId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  visitedNodeIds?: string[];
  discoveredNodeIds?: string[];
  queue?: string[];
  stack?: string[];
  output?: string[];
  distances?: Record<string, number | null>;
  indegrees?: Record<string, number>;
  previousNodeIds?: Record<string, string | null>;
  componentByNodeId?: Record<string, number>;
  acceptedEdgeIds?: string[];
  rejectedEdgeIds?: string[];
  pathNodeIds?: string[];
  pathEdgeIds?: string[];
  candidateEdgeIds?: string[];
  totalWeight?: number;
  backtracking?: boolean;
  success?: boolean;
  reason?: string;
};

export type GraphAlgorithmResult = {
  algorithm: GraphAlgorithmName;
  success: boolean;
  summary: string;
  reason?: string;
  steps: GraphAlgorithmStep[];
  traversalOrder?: string[];
  pathNodeIds?: string[];
  pathEdgeIds?: string[];
  cycleNodeIds?: string[];
  cycleEdgeIds?: string[];
  components?: Array<{ id: number; nodeIds: string[]; edgeIds: string[] }>;
  ordering?: string[];
  distances?: Record<string, number | null>;
  indegrees?: Record<string, number>;
  previousNodeIds?: Record<string, string | null>;
  acceptedEdgeIds?: string[];
  rejectedEdgeIds?: string[];
  totalWeight?: number;
};

export type GraphOperationName =
  | "create_graph" | "add_node" | "remove_node" | "add_edge" | "remove_edge"
  | "update_node" | "update_edge" | "inspect_graph" | "inspect_node" | "inspect_edge"
  | "get_neighbors" | "get_degree" | "select_graph_element" | "highlight_graph_elements"
  | "clear_graph_visual_state" | "set_graph_view" | "start_graph_execution"
  | "step_graph_execution" | "pause_graph_execution" | "reset_graph_execution"
  | "run_bfs" | "run_dfs" | "find_path" | "detect_cycle" | "connected_components"
  | "topological_sort" | "run_dijkstra" | "run_prim" | "run_kruskal";

export type GraphOperation = {
  name: GraphOperationName;
  input: Record<string, unknown>;
};

export type GraphOperationEventType =
  | "GRAPH_CREATED" | "NODE_CREATED" | "NODE_REMOVED" | "NODE_UPDATED"
  | "EDGE_CREATED" | "EDGE_REMOVED" | "EDGE_UPDATED"
  | "NODE_SELECTED" | "EDGE_SELECTED" | "NODE_HIGHLIGHTED" | "EDGE_HIGHLIGHTED"
  | "VISUAL_STATE_CLEARED" | "GRAPH_VIEW_CHANGED"
  | "EXECUTION_STARTED" | "EXECUTION_STEP" | "EXECUTION_PAUSED" | "EXECUTION_RESET";

export type GraphOperationEvent = {
  id: number;
  type: GraphOperationEventType;
  summary: string;
  elementId?: string;
};

export type GraphOperationResult<T> = {
  ok: boolean;
  summary: string;
  data?: T;
  error?: string;
  state?: GraphRuntimeState;
  event?: GraphOperationEvent;
};

/** Selection and emphasis only; never persisted as authored graph data. */
export type GraphViewState = {
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
  highlightedNodeIds?: string[];
  highlightedEdgeIds?: string[];
  activeNodeId?: string | null;
  activeEdgeId?: string | null;
  displayMode?: GraphDisplayMode;
};

/** Runtime execution state shared by generic controls and algorithm step playback. */
export type GraphExecutionState = {
  status?: GraphExecutionStatus;
  currentStep?: number;
  totalSteps?: number;
  visitedNodeIds?: string[];
  visitedEdgeIds?: string[];
  traversalPath?: string[];
  algorithm?: GraphAlgorithmName;
  algorithmSteps?: GraphAlgorithmStep[];
  algorithmStep?: GraphAlgorithmStep;
  algorithmResult?: GraphAlgorithmResult;
  discoveredNodeIds?: string[];
  acceptedEdgeIds?: string[];
  rejectedEdgeIds?: string[];
  pathNodeIds?: string[];
  pathEdgeIds?: string[];
  componentByNodeId?: Record<string, number>;
  distances?: Record<string, number | null>;
  indegrees?: Record<string, number>;
  previousNodeIds?: Record<string, string | null>;
  queue?: string[];
  stack?: string[];
  output?: string[];
};

/** Serializable Puck authoring shape. Position fields stay flat for the inspector. */
export type GraphBlockNode = {
  id: string;
  label: string;
  x?: number;
  y?: number;
};

export type GraphEdgeDirection = "inherit" | "directed" | "undirected";

export type GraphBlockEdge = {
  id: string;
  source: string;
  target: string;
  direction?: GraphEdgeDirection;
  weight?: number;
  label?: string;
};

/** Persisted block configuration. Runtime selection/highlighting lives in GraphViewState. */
export type GraphBlockProps = {
  graphId?: string;
  directed: boolean;
  weighted: boolean;
  displayMode?: GraphDisplayMode;
  nodes: GraphBlockNode[];
  edges: GraphBlockEdge[];
};


/** Runtime-only state consumed by renderers and operation handlers. */
export type GraphRuntimeState = {
  graph: GraphModel;
  view: GraphViewState;
  execution: GraphExecutionState;
  events: GraphOperationEvent[];
  eventSequence: number;
};
