/** Serializable binary-tree domain. Layout and transient playback are separate. */
export type TreeKind = "binary" | "bst" | "avl" | "heap";
export type ChildSide = "left" | "right";

export type TreeNode = {
  id: string;
  value: number;
  parentId: string | null;
  leftChildId: string | null;
  rightChildId: string | null;
};

export type HeapType = "min" | "max";
export type HeapEntry = { id: string; value: number; label?: string };
/** Heap entries are the source of truth; nodes are their derived complete binary-tree view. */
export type HeapModel = { type: HeapType; entries: HeapEntry[] };

export type TreeModel = {
  kind: TreeKind;
  rootId: string | null;
  nodes: TreeNode[];
  heap?: HeapModel;
};

export type TreeSelection = { type: "node"; id: string } | null;
export type TreeNodeVisualState =
  | "normal" | "selected" | "current" | "visited" | "highlighted"
  | "inserting" | "deleting" | "found" | "path" | "invalid";

export type TreeViewState = {
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
};

export type TreeStepType =
  | "start" | "enter_node" | "visit_node" | "exit_node" | "traverse_edge"
  | "compare" | "enqueue_node" | "dequeue_node" | "found" | "not_found"
  | "insert_node" | "mark_deleting" | "replace_value" | "delete_node"
  | "validate_node" | "violation" | "complete"
  | "calculate_height" | "calculate_balance" | "detect_imbalance"
  | "identify_rotation" | "rotate_left" | "rotate_right" | "rebalance"
  | "heapify_up" | "heapify_down" | "swap_nodes" | "extract_root"
  | "validate_heap" | "heap_complete";

/** One renderer-neutral teaching beat; treeAfter is applied only when reached. */
export type TreeStep = {
  index: number;
  type: TreeStepType;
  description: string;
  currentNodeId?: string;
  activeEdge?: { parentId: string; childId: string; side: ChildSide };
  visitedNodeIds?: string[];
  highlightedNodeIds?: string[];
  queue?: string[];
  output?: string[];
  comparison?: { value: number; against: number; relation: "<" | ">" | "=" };
  direction?: ChildSide;
  balanceFactor?: number;
  height?: number;
  rotationCase?: "LL" | "RR" | "LR" | "RL";
  heapIndices?: { current: number; parent?: number; left?: number; right?: number };
  heapArray?: HeapEntry[];
  treeAfter?: TreeModel;
  displayValues?: Record<string, number>;
  eventType?: TreeEventType;
  eventNodeId?: string;
  success?: boolean;
};

export type TreeExecutionStatus = "idle" | "running" | "paused" | "complete";
export type TreeExecutionState = {
  status: TreeExecutionStatus;
  operation: string | null;
  currentStep: number;
  totalSteps: number;
  steps: TreeStep[];
  step: TreeStep | null;
  result: TreePlanResult | null;
};

export type TreePlanResult = {
  success: boolean;
  summary: string;
  order?: string[];
  foundNodeId?: string | null;
  insertedNodeId?: string;
  deletedNodeId?: string;
  valid?: boolean;
  violations?: Array<{ nodeId: string; reason: string }>;
  balanceFactors?: Record<string, number>;
  rotationCases?: Array<"LL" | "RR" | "LR" | "RL">;
  heapType?: HeapType;
  extracted?: HeapEntry;
  priorityQueue?: HeapEntry[];
};

export type TreePlan = {
  operation: string;
  steps: TreeStep[];
  result: TreePlanResult;
};

export type TreeEventType =
  | "TREE_CREATED" | "NODE_CREATED" | "NODE_REMOVED" | "NODE_UPDATED"
  | "NODE_SELECTED" | "TREE_VISUAL_CLEARED" | "EXECUTION_STARTED"
  | "EXECUTION_STEP" | "EXECUTION_PAUSED" | "EXECUTION_RESET";

export type TreeEvent = {
  id: number;
  type: TreeEventType;
  summary: string;
  nodeId?: string;
};

export type TreeRuntimeState = {
  tree: TreeModel;
  view: TreeViewState;
  execution: TreeExecutionState;
  events: TreeEvent[];
  eventSequence: number;
};

export type TreeOperationResult<T> = {
  ok: boolean;
  summary: string;
  data?: T;
  error?: string;
  state?: TreeRuntimeState;
  event?: TreeEvent;
};
