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
import type {
  GraphBlockProps,
  GraphDisplayMode,
  GraphEdge,
  GraphModel,
  GraphNode,
} from "./types";

export const GRAPH_VIEWPORT = { width: 1000, height: 580 } as const;

export function edgeIsDirected(graph: GraphModel, edge: GraphEdge) {
  return edge.directed ?? graph.directed;
}

export function graphEdgeText(graph: GraphModel, edge: GraphEdge) {
  const parts = [edge.label?.trim()];
  if (graph.weighted && edge.weight !== undefined) parts.push(String(edge.weight));
  return parts.filter(Boolean).join(" · ");
}

export function graphNodeById(graph: GraphModel, id: string) {
  return graph.nodes.find((node) => node.id === id) ?? null;
}

export function graphNeighbors(graph: GraphModel, nodeId: string) {
  const neighborIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === nodeId) neighborIds.add(edge.target);
    if (!edgeIsDirected(graph, edge) && edge.target === nodeId) {
      neighborIds.add(edge.source);
    }
  }
  return graph.nodes.filter((node) => neighborIds.has(node.id));
}

export function graphNodeMetrics(graph: GraphModel, nodeId: string) {
  let degree = 0;
  let inDegree = 0;
  let outDegree = 0;

  for (const edge of graph.edges) {
    const directed = edgeIsDirected(graph, edge);
    if (!graph.directed) {
      if (edge.source === nodeId) degree += edge.target === nodeId ? 2 : 1;
      else if (edge.target === nodeId) degree++;
      continue;
    }

    if (directed) {
      if (edge.source === nodeId) outDegree++;
      if (edge.target === nodeId) inDegree++;
    } else if (edge.source === nodeId || edge.target === nodeId) {
      // An undirected override on a directed graph is reachable both ways.
      inDegree++;
      outDegree++;
    }
  }

  return graph.directed ? { inDegree, outDegree } : { degree };
}

export type GraphAdjacencyEntry = {
  node: GraphNode;
  neighbors: Array<{ node: GraphNode; edge: GraphEdge }>;
};

export function graphAdjacencyList(graph: GraphModel): GraphAdjacencyEntry[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const entries = new Map(
    graph.nodes.map((node) => [node.id, [] as GraphAdjacencyEntry["neighbors"]]),
  );

  for (const edge of graph.edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    entries.get(source.id)?.push({ node: target, edge });
    if (!edgeIsDirected(graph, edge) && source.id !== target.id) {
      entries.get(target.id)?.push({ node: source, edge });
    }
  }

  return graph.nodes.map((node) => ({
    node,
    neighbors: entries.get(node.id) ?? [],
  }));
}

export function graphAdjacencyMatrix(graph: GraphModel) {
  const indexById = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const matrix = graph.nodes.map(() => graph.nodes.map(() => [] as GraphEdge[]));

  for (const edge of graph.edges) {
    const source = indexById.get(edge.source);
    const target = indexById.get(edge.target);
    if (source === undefined || target === undefined) continue;
    matrix[source][target].push(edge);
    if (!edgeIsDirected(graph, edge) && source !== target) {
      matrix[target][source].push(edge);
    }
  }

  return matrix;
}

function fallbackPosition(index: number, total: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(total, 1);
  const radius = Math.min(GRAPH_VIEWPORT.width, GRAPH_VIEWPORT.height) * 0.32;
  return {
    x: GRAPH_VIEWPORT.width / 2 + Math.cos(angle) * radius,
    y: GRAPH_VIEWPORT.height / 2 + Math.sin(angle) * radius,
  };
}

/** Converts serializable Puck props into the normalized graph rendering model. */
export function toGraphModel(props: GraphBlockProps & { id: string }): GraphModel {
  const nodes = (props.nodes ?? []).map((node, index, all) => {
    const fallback = fallbackPosition(index, all.length);
    return {
      id: node.id,
      label: node.label || node.id,
      position: {
        x: typeof node.x === "number" ? node.x : fallback.x,
        y: typeof node.y === "number" ? node.y : fallback.y,
      },
    };
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const graphDirected = props.directed ?? true;
  const edges = (props.edges ?? [])
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      directed:
        edge.direction === "directed"
          ? true
          : edge.direction === "undirected"
            ? false
            : graphDirected,
      weight: typeof edge.weight === "number" ? edge.weight : undefined,
      label: edge.label?.trim() || undefined,
    }));

  return {
    id: props.graphId?.trim() || props.id,
    directed: graphDirected,
    weighted: props.weighted ?? false,
    nodes,
    edges,
  };
}

export function isGraphDisplayMode(value: unknown): value is GraphDisplayMode {
  return value === "graph" || value === "list" || value === "matrix";
}
