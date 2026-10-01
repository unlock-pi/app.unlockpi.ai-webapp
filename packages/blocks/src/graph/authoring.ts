import { GRAPH_VIEWPORT, isGraphDisplayMode } from "./model";
import type {
  GraphBlockEdge,
  GraphBlockNode,
  GraphBlockProps,
  GraphEdgeDirection,
} from "./types";

function unusedId(used: Set<string>, prefix: string, start: number) {
  let index = start;
  while (used.has(`${prefix}${index}`)) index++;
  return `${prefix}${index}`;
}

/** Puck can reuse an array index after deletion, so IDs must be reconciled. */
export function nextGraphId(
  items: readonly { id: string }[],
  prefix: "n" | "e",
  index = items.length,
) {
  const used = new Set(items.map((item) => item.id.trim()).filter(Boolean));
  return unusedId(used, prefix, index);
}

function finiteCoordinate(value: unknown, fallback: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(40, Math.min(maximum - 40, Math.round(value)))
    : fallback;
}

function normalizedDirection(value: unknown): GraphEdgeDirection {
  return value === "directed" || value === "undirected" ? value : "inherit";
}

/**
 * Normalizes only persisted authoring data. Selection and execution state
 * belong to the separate graph view context, never in this result.
 */
export function reconcileGraphProps(
  props: GraphBlockProps,
  previous?: GraphBlockProps | null,
): GraphBlockProps {
  const usedNodeIds = new Set<string>();
  const nodes: GraphBlockNode[] = (props.nodes ?? []).map((node, index) => {
    const requestedId = node.id?.trim() ?? "";
    const id =
      requestedId && !usedNodeIds.has(requestedId)
        ? requestedId
        : unusedId(usedNodeIds, "n", index);
    usedNodeIds.add(id);
    const fallbackX = 170 + (index % 4) * 220;
    const fallbackY = index < 4 ? 180 : 400;
    return {
      id,
      label: node.label?.trim() || id,
      x: finiteCoordinate(node.x, fallbackX, GRAPH_VIEWPORT.width),
      y: finiteCoordinate(node.y, fallbackY, GRAPH_VIEWPORT.height),
    };
  });

  const usedEdgeIds = new Set<string>();
  const edges: GraphBlockEdge[] = (props.edges ?? []).map((edge, index) => {
    const requestedId = edge.id?.trim() ?? "";
    const id =
      requestedId && !usedEdgeIds.has(requestedId)
        ? requestedId
        : unusedId(usedEdgeIds, "e", index);
    usedEdgeIds.add(id);
    return {
      id,
      source: edge.source?.trim() ?? "",
      target: edge.target?.trim() ?? "",
      direction: normalizedDirection(edge.direction),
      weight:
        typeof edge.weight === "number" && Number.isFinite(edge.weight)
          ? edge.weight
          : undefined,
      label: edge.label?.trim() || "",
    };
  });

  return {
    ...props,
    graphId: props.graphId?.trim() || previous?.graphId || "",
    directed: props.directed ?? previous?.directed ?? true,
    weighted: props.weighted ?? previous?.weighted ?? true,
    displayMode: isGraphDisplayMode(props.displayMode)
      ? props.displayMode
      : previous?.displayMode ?? "graph",
    nodes,
    edges,
  };
}
