import { edgeIsDirected, graphNodeById } from "./model";
import type {
  GraphAlgorithmName,
  GraphAlgorithmResult,
  GraphAlgorithmStep,
  GraphEdge,
  GraphModel,
} from "./types";

export type StartNodeInput = { startNode: string };
export type PathInput = { source: string; target: string };
export type DijkstraInput = { source: string; target?: string };

type Neighbor = { nodeId: string; edge: GraphEdge };
type StepInput = Omit<GraphAlgorithmStep, "index">;

function steps() {
  const value: GraphAlgorithmStep[] = [];
  return {
    value,
    add(input: StepInput) {
      value.push({ ...input, index: value.length + 1 });
    },
  };
}

function result(
  algorithm: GraphAlgorithmName,
  success: boolean,
  summary: string,
  executionSteps: GraphAlgorithmStep[],
  extra: Omit<GraphAlgorithmResult, "algorithm" | "success" | "summary" | "steps"> = {},
): GraphAlgorithmResult {
  return { algorithm, success, summary, steps: executionSteps, ...extra };
}

function invalid(algorithm: GraphAlgorithmName, summary: string): GraphAlgorithmResult {
  return result(algorithm, false, summary, [], { reason: summary });
}

function nodeExists(graph: GraphModel, id: string) {
  return Boolean(graphNodeById(graph, id));
}

function directedNeighbors(graph: GraphModel, nodeId: string): Neighbor[] {
  const output: Neighbor[] = [];
  for (const edge of graph.edges) {
    if (edge.source === nodeId) output.push({ nodeId: edge.target, edge });
    if (!edgeIsDirected(graph, edge) && edge.target === nodeId && edge.source !== nodeId) {
      output.push({ nodeId: edge.source, edge });
    }
  }
  return output.sort((a, b) => a.nodeId.localeCompare(b.nodeId) || a.edge.id.localeCompare(b.edge.id));
}

/** Weak adjacency intentionally treats every edge as a connection. */
function weakNeighbors(graph: GraphModel, nodeId: string): Neighbor[] {
  const output: Neighbor[] = [];
  for (const edge of graph.edges) {
    if (edge.source === nodeId) output.push({ nodeId: edge.target, edge });
    else if (edge.target === nodeId) output.push({ nodeId: edge.source, edge });
  }
  return output.sort((a, b) => a.nodeId.localeCompare(b.nodeId) || a.edge.id.localeCompare(b.edge.id));
}

function requireWeighted(graph: GraphModel, algorithm: GraphAlgorithmName): string | null {
  if (!graph.weighted) return algorithm === "dijkstra" ? "Dijkstra requires weighted edges." : "This algorithm requires weighted edges.";
  const invalidEdge = graph.edges.find((edge) => edge.weight === undefined || !Number.isFinite(edge.weight));
  return invalidEdge ? "Every edge must have a finite weight." : null;
}

function requireUndirectedWeighted(graph: GraphModel, algorithm: "prim" | "kruskal"): string | null {
  const weightedError = requireWeighted(graph, algorithm);
  if (weightedError) return weightedError;
  if (graph.directed || graph.edges.some((edge) => edgeIsDirected(graph, edge))) {
    return algorithm === "prim" ? "Prim requires an undirected weighted graph." : "Kruskal requires an undirected weighted graph.";
  }
  return null;
}

function cloneDistances(distances: Record<string, number>) {
  return Object.fromEntries(Object.entries(distances).map(([id, value]) => [id, Number.isFinite(value) ? value : null]));
}

function reconstructPath(
  source: string,
  target: string,
  previous: Record<string, string | null>,
  previousEdges: Record<string, string | null>,
) {
  if (source !== target && !previous[target]) return { nodeIds: [] as string[], edgeIds: [] as string[] };
  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let current: string | null = target;
  while (current) {
    nodeIds.unshift(current);
    const edgeId = previousEdges[current];
    if (edgeId) edgeIds.unshift(edgeId);
    if (current === source) break;
    current = previous[current];
  }
  return nodeIds[0] === source ? { nodeIds, edgeIds } : { nodeIds: [], edgeIds: [] };
}

export function buildBfs(graph: GraphModel, input: StartNodeInput): GraphAlgorithmResult {
  const startNode = input.startNode.trim();
  if (!startNode) return invalid("bfs", "Start node is required.");
  if (!nodeExists(graph, startNode)) return invalid("bfs", "Start node " + startNode + " does not exist.");
  const writer = steps();
  const queue = [startNode];
  const discovered = new Set(queue);
  const visited: string[] = [];
  writer.add({ type: "initialize", description: "Start BFS at " + startNode + ".", currentNodeId: startNode, queue: [...queue], discoveredNodeIds: [...discovered], visitedNodeIds: visited });
  while (queue.length) {
    const current = queue.shift()!;
    visited.push(current);
    writer.add({ type: "visit_node", description: "Visit " + current + ".", currentNodeId: current, queue: [...queue], discoveredNodeIds: [...discovered], visitedNodeIds: [...visited] });
    for (const neighbor of directedNeighbors(graph, current)) {
      if (discovered.has(neighbor.nodeId)) continue;
      writer.add({ type: "traverse_edge", description: "Examine " + current + " to " + neighbor.nodeId + ".", currentNodeId: current, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, fromNodeId: current, toNodeId: neighbor.nodeId, queue: [...queue], discoveredNodeIds: [...discovered], visitedNodeIds: [...visited] });
      discovered.add(neighbor.nodeId);
      queue.push(neighbor.nodeId);
      writer.add({ type: "discover_node", description: "Discover " + neighbor.nodeId + " and add it to the queue.", currentNodeId: neighbor.nodeId, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, queue: [...queue], discoveredNodeIds: [...discovered], visitedNodeIds: [...visited] });
    }
  }
  writer.add({ type: "complete", description: "BFS complete: " + visited.join(" → ") + ".", visitedNodeIds: [...visited], discoveredNodeIds: [...discovered], output: [...visited], success: true });
  return result("bfs", true, "BFS visited " + visited.length + " node" + (visited.length === 1 ? "" : "s") + ".", writer.value, { traversalOrder: visited });
}

export function buildDfs(graph: GraphModel, input: StartNodeInput): GraphAlgorithmResult {
  const startNode = input.startNode.trim();
  if (!startNode) return invalid("dfs", "Start node is required.");
  if (!nodeExists(graph, startNode)) return invalid("dfs", "Start node " + startNode + " does not exist.");
  const writer = steps();
  const visited = new Set<string>();
  const order: string[] = [];
  const stack: string[] = [];
  const walk = (nodeId: string, incomingEdgeId?: string) => {
    visited.add(nodeId);
    order.push(nodeId);
    stack.push(nodeId);
    writer.add({ type: "visit_node", description: "Visit " + nodeId + ".", currentNodeId: nodeId, currentEdgeId: incomingEdgeId, traversedEdgeId: incomingEdgeId, stack: [...stack], visitedNodeIds: [...visited], discoveredNodeIds: [...visited] });
    for (const neighbor of directedNeighbors(graph, nodeId)) {
      if (visited.has(neighbor.nodeId)) continue;
      writer.add({ type: "traverse_edge", description: "Follow " + nodeId + " to " + neighbor.nodeId + ".", currentNodeId: nodeId, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, fromNodeId: nodeId, toNodeId: neighbor.nodeId, stack: [...stack], visitedNodeIds: [...visited] });
      walk(neighbor.nodeId, neighbor.edge.id);
    }
    stack.pop();
    writer.add({ type: "backtrack", description: "Backtrack from " + nodeId + ".", currentNodeId: stack.at(-1), stack: [...stack], visitedNodeIds: [...visited], backtracking: true });
  };
  writer.add({ type: "initialize", description: "Start DFS at " + startNode + ".", currentNodeId: startNode, stack: [], visitedNodeIds: [] });
  walk(startNode);
  writer.add({ type: "complete", description: "DFS complete: " + order.join(" → ") + ".", visitedNodeIds: [...visited], output: [...order], success: true });
  return result("dfs", true, "DFS visited " + order.length + " node" + (order.length === 1 ? "" : "s") + ".", writer.value, { traversalOrder: order });
}

export function buildFindPath(graph: GraphModel, input: PathInput): GraphAlgorithmResult {
  const source = input.source.trim();
  const target = input.target.trim();
  if (!source) return invalid("find_path", "Source node is required.");
  if (!target) return invalid("find_path", "Target node is required.");
  if (!nodeExists(graph, source)) return invalid("find_path", "Source node " + source + " does not exist.");
  if (!nodeExists(graph, target)) return invalid("find_path", "Target node " + target + " does not exist.");
  const writer = steps();
  const queue = [source];
  const discovered = new Set(queue);
  const visited: string[] = [];
  const previous: Record<string, string | null> = Object.fromEntries(graph.nodes.map((node) => [node.id, null]));
  const previousEdges: Record<string, string | null> = Object.fromEntries(graph.nodes.map((node) => [node.id, null]));
  writer.add({ type: "initialize", description: "Search for a path from " + source + " to " + target + ".", currentNodeId: source, queue: [...queue], discoveredNodeIds: [...discovered] });
  while (queue.length && !discovered.has(target)) {
    const current = queue.shift()!;
    visited.push(current);
    writer.add({ type: "visit_node", description: "Explore " + current + ".", currentNodeId: current, queue: [...queue], visitedNodeIds: [...visited], discoveredNodeIds: [...discovered] });
    for (const neighbor of directedNeighbors(graph, current)) {
      if (discovered.has(neighbor.nodeId)) continue;
      writer.add({ type: "traverse_edge", description: "Try " + current + " to " + neighbor.nodeId + ".", currentNodeId: current, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, fromNodeId: current, toNodeId: neighbor.nodeId, queue: [...queue], visitedNodeIds: [...visited], discoveredNodeIds: [...discovered] });
      discovered.add(neighbor.nodeId);
      previous[neighbor.nodeId] = current;
      previousEdges[neighbor.nodeId] = neighbor.edge.id;
      queue.push(neighbor.nodeId);
      writer.add({ type: "discover_node", description: "Discover " + neighbor.nodeId + ".", currentNodeId: neighbor.nodeId, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, queue: [...queue], visitedNodeIds: [...visited], discoveredNodeIds: [...discovered] });
      if (neighbor.nodeId === target) break;
    }
  }
  const path = reconstructPath(source, target, previous, previousEdges);
  const found = path.nodeIds.length > 0;
  writer.add({ type: "complete", description: found ? "Path found: " + path.nodeIds.join(" → ") + "." : "No path exists from " + source + " to " + target + ".", visitedNodeIds: [...visited], pathNodeIds: path.nodeIds, pathEdgeIds: path.edgeIds, output: path.nodeIds, success: found });
  return result("find_path", found, found ? "Path found." : "No path exists.", writer.value, { reason: found ? undefined : "No path exists.", pathNodeIds: path.nodeIds, pathEdgeIds: path.edgeIds, traversalOrder: visited });
}

export function buildCycleDetection(graph: GraphModel): GraphAlgorithmResult {
  const writer = steps();
  const state = new Map<string, "new" | "active" | "done">(graph.nodes.map((node) => [node.id, "new"]));
  const nodeStack: string[] = [];
  const edgeStack: string[] = [];
  const visited: string[] = [];
  let cycleNodeIds: string[] = [];
  let cycleEdgeIds: string[] = [];
  const neighborsFor = directedNeighbors;
  const visit = (nodeId: string, parentEdgeId?: string): boolean => {
    state.set(nodeId, "active");
    nodeStack.push(nodeId);
    visited.push(nodeId);
    writer.add({ type: "visit_node", description: "Visit " + nodeId + ".", currentNodeId: nodeId, stack: [...nodeStack], visitedNodeIds: [...visited] });
    for (const neighbor of neighborsFor(graph, nodeId)) {
      if (!edgeIsDirected(graph, neighbor.edge) && neighbor.edge.id === parentEdgeId) continue;
      writer.add({ type: "traverse_edge", description: "Inspect " + nodeId + " to " + neighbor.nodeId + ".", currentNodeId: nodeId, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, fromNodeId: nodeId, toNodeId: neighbor.nodeId, stack: [...nodeStack], visitedNodeIds: [...visited] });
      const neighborState = state.get(neighbor.nodeId);
      if (neighborState === "active") {
        const start = nodeStack.indexOf(neighbor.nodeId);
        cycleNodeIds = [...nodeStack.slice(start), neighbor.nodeId];
        cycleEdgeIds = [...edgeStack.slice(start), neighbor.edge.id];
        writer.add({ type: "cycle_detected", description: "Cycle detected: " + cycleNodeIds.join(" → ") + ".", currentNodeId: neighbor.nodeId, currentEdgeId: neighbor.edge.id, visitedNodeIds: [...visited], pathNodeIds: cycleNodeIds, pathEdgeIds: cycleEdgeIds, success: true });
        return true;
      }
      if (neighborState === "new") {
        edgeStack.push(neighbor.edge.id);
        if (visit(neighbor.nodeId, neighbor.edge.id)) return true;
        edgeStack.pop();
      }
    }
    nodeStack.pop();
    state.set(nodeId, "done");
    writer.add({ type: "backtrack", description: "Finish " + nodeId + ".", currentNodeId: nodeStack.at(-1), stack: [...nodeStack], visitedNodeIds: [...visited], backtracking: true });
    return false;
  };
  writer.add({ type: "initialize", description: "Search the graph for a cycle.", visitedNodeIds: [] });
  for (const node of graph.nodes) if (state.get(node.id) === "new" && visit(node.id)) break;
  const hasCycle = cycleNodeIds.length > 0;
  if (!hasCycle) writer.add({ type: "complete", description: "No cycle was found.", visitedNodeIds: [...visited], success: true });
  return result("detect_cycle", true, hasCycle ? "Cycle detected." : "No cycle detected.", writer.value, { cycleNodeIds, cycleEdgeIds });
}

export function buildConnectedComponents(graph: GraphModel): GraphAlgorithmResult {
  const writer = steps();
  const seen = new Set<string>();
  const componentByNodeId: Record<string, number> = {};
  const components: Array<{ id: number; nodeIds: string[]; edgeIds: string[] }> = [];
  writer.add({ type: "initialize", description: "Find weakly connected components.", componentByNodeId });
  for (const root of graph.nodes) {
    if (seen.has(root.id)) continue;
    const id = components.length + 1;
    const queue = [root.id];
    const nodeIds: string[] = [];
    seen.add(root.id);
    componentByNodeId[root.id] = id;
    writer.add({ type: "component_started", description: "Start component " + id + " at " + root.id + ".", currentNodeId: root.id, queue: [...queue], visitedNodeIds: [...seen], componentByNodeId: { ...componentByNodeId } });
    while (queue.length) {
      const current = queue.shift()!;
      nodeIds.push(current);
      writer.add({ type: "visit_node", description: "Add " + current + " to component " + id + ".", currentNodeId: current, queue: [...queue], visitedNodeIds: [...seen], componentByNodeId: { ...componentByNodeId } });
      for (const neighbor of weakNeighbors(graph, current)) {
        if (seen.has(neighbor.nodeId)) continue;
        seen.add(neighbor.nodeId);
        componentByNodeId[neighbor.nodeId] = id;
        queue.push(neighbor.nodeId);
        writer.add({ type: "discover_node", description: "Discover " + neighbor.nodeId + " in component " + id + ".", currentNodeId: neighbor.nodeId, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, queue: [...queue], visitedNodeIds: [...seen], componentByNodeId: { ...componentByNodeId } });
      }
    }
    const nodes = new Set(nodeIds);
    components.push({ id, nodeIds, edgeIds: graph.edges.filter((edge) => nodes.has(edge.source) && nodes.has(edge.target)).map((edge) => edge.id) });
  }
  writer.add({ type: "complete", description: "Found " + components.length + " component" + (components.length === 1 ? "" : "s") + ".", visitedNodeIds: [...seen], componentByNodeId: { ...componentByNodeId }, output: components.map((component) => "Component " + component.id + ": " + component.nodeIds.join(", ")), success: true });
  return result("connected_components", true, "Found " + components.length + " component" + (components.length === 1 ? "" : "s") + ".", writer.value, { components });
}

export function buildTopologicalSort(graph: GraphModel): GraphAlgorithmResult {
  if (!graph.directed || graph.edges.some((edge) => !edgeIsDirected(graph, edge))) return invalid("topological_sort", "Topological sorting requires a directed graph.");
  const writer = steps();
  const indegree: Record<string, number> = Object.fromEntries(graph.nodes.map((node) => [node.id, 0]));
  for (const edge of graph.edges) indegree[edge.target]++;
  const queue = graph.nodes.filter((node) => indegree[node.id] === 0).map((node) => node.id);
  const output: string[] = [];
  writer.add({ type: "initialize", description: "Start with every node whose indegree is zero.", queue: [...queue], output: [...output], indegrees: { ...indegree }, visitedNodeIds: [] });
  while (queue.length) {
    const current = queue.shift()!;
    output.push(current);
    writer.add({ type: "visit_node", description: "Place " + current + " in the ordering.", currentNodeId: current, queue: [...queue], output: [...output], indegrees: { ...indegree }, visitedNodeIds: [...output] });
    for (const neighbor of directedNeighbors(graph, current)) {
      indegree[neighbor.nodeId]--;
      writer.add({ type: "traverse_edge", description: "Reduce the indegree of " + neighbor.nodeId + " to " + indegree[neighbor.nodeId] + ".", currentNodeId: current, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, fromNodeId: current, toNodeId: neighbor.nodeId, queue: [...queue], output: [...output], indegrees: { ...indegree }, visitedNodeIds: [...output] });
      if (indegree[neighbor.nodeId] === 0) {
        queue.push(neighbor.nodeId);
        writer.add({ type: "enqueue_node", description: neighbor.nodeId + " now has indegree zero.", currentNodeId: neighbor.nodeId, queue: [...queue], output: [...output], indegrees: { ...indegree }, visitedNodeIds: [...output] });
      }
    }
  }
  const success = output.length === graph.nodes.length;
  writer.add({ type: "complete", description: success ? "Topological ordering complete: " + output.join(" → ") + "." : "Graph contains a cycle; no topological ordering exists.", output: [...output], indegrees: { ...indegree }, visitedNodeIds: [...output], success, reason: success ? undefined : "Graph contains a cycle" });
  return result("topological_sort", success, success ? "Topological ordering complete." : "Graph contains a cycle.", writer.value, { reason: success ? undefined : "Graph contains a cycle", ordering: success ? output : [] });
}

export function buildDijkstra(graph: GraphModel, input: DijkstraInput): GraphAlgorithmResult {
  const weightError = requireWeighted(graph, "dijkstra");
  if (weightError) return invalid("dijkstra", weightError);
  if (graph.edges.some((edge) => (edge.weight ?? 0) < 0)) return invalid("dijkstra", "Dijkstra does not support negative edge weights.");
  const source = input.source.trim();
  const target = input.target?.trim() || undefined;
  if (!source) return invalid("dijkstra", "Source node is required.");
  if (!nodeExists(graph, source)) return invalid("dijkstra", "Source node " + source + " does not exist.");
  if (target && !nodeExists(graph, target)) return invalid("dijkstra", "Target node " + target + " does not exist.");
  const writer = steps();
  const distances: Record<string, number> = Object.fromEntries(graph.nodes.map((node) => [node.id, Infinity]));
  const previous: Record<string, string | null> = Object.fromEntries(graph.nodes.map((node) => [node.id, null]));
  const previousEdges: Record<string, string | null> = Object.fromEntries(graph.nodes.map((node) => [node.id, null]));
  const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: source, distance: 0 }];
  const visited = new Set<string>();
  distances[source] = 0;
  writer.add({ type: "initialize", description: "Set the distance to " + source + " to 0.", currentNodeId: source, queue: [source], distances: cloneDistances(distances), previousNodeIds: { ...previous }, visitedNodeIds: [] });
  while (queue.length) {
    queue.sort((a, b) => a.distance - b.distance || a.nodeId.localeCompare(b.nodeId));
    const current = queue.shift()!;
    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);
    writer.add({ type: "visit_node", description: "Choose " + current.nodeId + " with distance " + current.distance + ".", currentNodeId: current.nodeId, queue: queue.map((item) => item.nodeId), distances: cloneDistances(distances), previousNodeIds: { ...previous }, visitedNodeIds: [...visited] });
    if (target === current.nodeId) break;
    for (const neighbor of directedNeighbors(graph, current.nodeId)) {
      if (visited.has(neighbor.nodeId)) continue;
      const candidate = distances[current.nodeId] + (neighbor.edge.weight ?? 0);
      writer.add({ type: "traverse_edge", description: "Examine " + current.nodeId + " to " + neighbor.nodeId + ".", currentNodeId: current.nodeId, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, fromNodeId: current.nodeId, toNodeId: neighbor.nodeId, queue: queue.map((item) => item.nodeId), distances: cloneDistances(distances), previousNodeIds: { ...previous }, visitedNodeIds: [...visited] });
      if (candidate >= distances[neighbor.nodeId]) continue;
      distances[neighbor.nodeId] = candidate;
      previous[neighbor.nodeId] = current.nodeId;
      previousEdges[neighbor.nodeId] = neighbor.edge.id;
      queue.push({ nodeId: neighbor.nodeId, distance: candidate });
      writer.add({ type: "relax_edge", description: "Update " + neighbor.nodeId + " to distance " + candidate + ".", currentNodeId: neighbor.nodeId, currentEdgeId: neighbor.edge.id, traversedEdgeId: neighbor.edge.id, fromNodeId: current.nodeId, toNodeId: neighbor.nodeId, queue: queue.map((item) => item.nodeId), distances: cloneDistances(distances), previousNodeIds: { ...previous }, visitedNodeIds: [...visited] });
    }
  }
  const path = target ? reconstructPath(source, target, previous, previousEdges) : { nodeIds: [] as string[], edgeIds: [] as string[] };
  const reachedTarget = !target || path.nodeIds.length > 0;
  writer.add({ type: "complete", description: target ? reachedTarget ? "Shortest path: " + path.nodeIds.join(" → ") + ", distance " + distances[target] + "." : "No path exists from " + source + " to " + target + "." : "Dijkstra complete.", currentNodeId: target, distances: cloneDistances(distances), previousNodeIds: { ...previous }, visitedNodeIds: [...visited], pathNodeIds: path.nodeIds, pathEdgeIds: path.edgeIds, output: target ? path.nodeIds : [], success: reachedTarget });
  return result("dijkstra", reachedTarget, reachedTarget ? "Dijkstra complete." : "No path exists.", writer.value, { reason: reachedTarget ? undefined : "No path exists.", distances: cloneDistances(distances), previousNodeIds: previous, pathNodeIds: path.nodeIds, pathEdgeIds: path.edgeIds });
}

export function buildPrim(graph: GraphModel, input: StartNodeInput): GraphAlgorithmResult {
  const error = requireUndirectedWeighted(graph, "prim");
  if (error) return invalid("prim", error);
  const startNode = input.startNode.trim();
  if (!startNode) return invalid("prim", "Start node is required.");
  if (!nodeExists(graph, startNode)) return invalid("prim", "Start node " + startNode + " does not exist.");
  const writer = steps();
  const visited = new Set([startNode]);
  const acceptedEdgeIds: string[] = [];
  let totalWeight = 0;
  writer.add({ type: "initialize", description: "Start Prim's algorithm at " + startNode + ".", currentNodeId: startNode, visitedNodeIds: [...visited], acceptedEdgeIds: [...acceptedEdgeIds], totalWeight });
  while (visited.size < graph.nodes.length) {
    const candidates = graph.edges.filter((edge) => visited.has(edge.source) !== visited.has(edge.target)).sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0) || a.id.localeCompare(b.id));
    if (!candidates.length) {
      writer.add({ type: "complete", description: "The graph is disconnected, so no spanning tree can cover every node.", visitedNodeIds: [...visited], acceptedEdgeIds: [...acceptedEdgeIds], totalWeight, success: false, reason: "Graph is disconnected." });
      return result("prim", false, "Graph is disconnected; no spanning tree exists.", writer.value, { reason: "Graph is disconnected.", acceptedEdgeIds, totalWeight });
    }
    const edge = candidates[0];
    const nextNode = visited.has(edge.source) ? edge.target : edge.source;
    writer.add({ type: "traverse_edge", description: "Consider the minimum outgoing edge " + edge.id + ".", currentNodeId: nextNode, currentEdgeId: edge.id, traversedEdgeId: edge.id, fromNodeId: visited.has(edge.source) ? edge.source : edge.target, toNodeId: nextNode, visitedNodeIds: [...visited], acceptedEdgeIds: [...acceptedEdgeIds], candidateEdgeIds: candidates.map((item) => item.id), totalWeight });
    visited.add(nextNode);
    acceptedEdgeIds.push(edge.id);
    totalWeight += edge.weight ?? 0;
    writer.add({ type: "accept_edge", description: "Accept " + edge.source + " — " + edge.target + " (" + edge.weight + ").", currentNodeId: nextNode, currentEdgeId: edge.id, fromNodeId: edge.source === nextNode ? edge.target : edge.source, toNodeId: nextNode, visitedNodeIds: [...visited], acceptedEdgeIds: [...acceptedEdgeIds], candidateEdgeIds: candidates.map((item) => item.id), totalWeight });
  }
  writer.add({ type: "complete", description: "Minimum spanning tree complete, total weight " + totalWeight + ".", visitedNodeIds: [...visited], acceptedEdgeIds: [...acceptedEdgeIds], totalWeight, success: true });
  return result("prim", true, "Minimum spanning tree complete.", writer.value, { acceptedEdgeIds, totalWeight });
}

export function buildKruskal(graph: GraphModel): GraphAlgorithmResult {
  const error = requireUndirectedWeighted(graph, "kruskal");
  if (error) return invalid("kruskal", error);
  const writer = steps();
  const parent = new Map(graph.nodes.map((node) => [node.id, node.id]));
  const find = (id: string): string => {
    const current = parent.get(id)!;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const acceptedEdgeIds: string[] = [];
  const rejectedEdgeIds: string[] = [];
  let totalWeight = 0;
  const sorted = [...graph.edges].sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0) || a.id.localeCompare(b.id));
  writer.add({ type: "initialize", description: "Sort edges from smallest to largest weight.", acceptedEdgeIds: [], rejectedEdgeIds: [], candidateEdgeIds: sorted.map((edge) => edge.id), totalWeight });
  for (const edge of sorted) {
    writer.add({ type: "traverse_edge", description: "Inspect " + edge.source + " — " + edge.target + " (" + edge.weight + ").", currentEdgeId: edge.id, traversedEdgeId: edge.id, fromNodeId: edge.source, toNodeId: edge.target, acceptedEdgeIds: [...acceptedEdgeIds], rejectedEdgeIds: [...rejectedEdgeIds], totalWeight });
    if (find(edge.source) === find(edge.target)) {
      rejectedEdgeIds.push(edge.id);
      writer.add({ type: "reject_edge", description: "Reject " + edge.id + " because it creates a cycle.", currentEdgeId: edge.id, rejectedEdgeIds: [...rejectedEdgeIds], acceptedEdgeIds: [...acceptedEdgeIds], totalWeight });
      continue;
    }
    parent.set(find(edge.source), find(edge.target));
    acceptedEdgeIds.push(edge.id);
    totalWeight += edge.weight ?? 0;
    writer.add({ type: "accept_edge", description: "Accept " + edge.source + " — " + edge.target + " (" + edge.weight + ").", currentEdgeId: edge.id, acceptedEdgeIds: [...acceptedEdgeIds], rejectedEdgeIds: [...rejectedEdgeIds], totalWeight });
  }
  const success = acceptedEdgeIds.length === Math.max(0, graph.nodes.length - 1);
  writer.add({ type: "complete", description: success ? "Minimum spanning tree complete, total weight " + totalWeight + "." : "The graph is disconnected, so no spanning tree can cover every node.", acceptedEdgeIds: [...acceptedEdgeIds], rejectedEdgeIds: [...rejectedEdgeIds], totalWeight, success, reason: success ? undefined : "Graph is disconnected." });
  return result("kruskal", success, success ? "Minimum spanning tree complete." : "Graph is disconnected; no spanning tree exists.", writer.value, { reason: success ? undefined : "Graph is disconnected.", acceptedEdgeIds, rejectedEdgeIds, totalWeight });
}
