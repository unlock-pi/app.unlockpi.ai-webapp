export type VisualType = "map" | "chart" | "flow" | "graph";

export interface MapVisual {
  type: "map";
  title: string;
  locations: Array<{ name: string; lat: number; lng: number }>;
  connections: Array<[number, number]>;
  animation: {
    type: "route";
    speed: number;
  };
}

export interface ChartVisual {
  type: "chart";
  chartType: "bar" | "line" | "pie";
  labels: string[];
  values: number[];
  animation: {
    type: "grow";
    duration: number;
  };
}

export interface FlowVisual {
  type: "flow";
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ from: string; to: string }>;
  animation: {
    type: "step";
    delay: number;
  };
}

export interface GraphVisual {
  type: "graph";
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ source: string; target: string }>;
  layout: "force";
  animation: {
    type: "expand";
  };
}

export type VisualPayload = MapVisual | ChartVisual | FlowVisual | GraphVisual;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseVisualPayload(payload: unknown): VisualPayload | null {
  if (!isObject(payload)) return null;

  const candidate = isObject(payload.data) ? payload.data : payload;
  if (!isObject(candidate) || typeof candidate.type !== "string") return null;

  if (candidate.type === "map") {
    if (
      typeof candidate.title !== "string" ||
      !Array.isArray(candidate.locations) ||
      !Array.isArray(candidate.connections) ||
      !isObject(candidate.animation) ||
      candidate.animation.type !== "route" ||
      !isNumber(candidate.animation.speed)
    ) {
      return null;
    }

    const locations = candidate.locations.filter(
      (loc): loc is { name: string; lat: number; lng: number } =>
        isObject(loc) && typeof loc.name === "string" && isNumber(loc.lat) && isNumber(loc.lng)
    );

    const connections = candidate.connections.filter(
      (point): point is [number, number] =>
        Array.isArray(point) && point.length === 2 && isNumber(point[0]) && isNumber(point[1])
    );

    if (locations.length !== candidate.locations.length || connections.length !== candidate.connections.length) {
      return null;
    }

    return {
      type: "map",
      title: candidate.title,
      locations,
      connections,
      animation: { type: "route", speed: candidate.animation.speed },
    };
  }

  if (candidate.type === "chart") {
    if (
      (candidate.chartType !== "bar" && candidate.chartType !== "line" && candidate.chartType !== "pie") ||
      !Array.isArray(candidate.labels) ||
      !Array.isArray(candidate.values) ||
      !isObject(candidate.animation) ||
      candidate.animation.type !== "grow" ||
      !isNumber(candidate.animation.duration)
    ) {
      return null;
    }

    if (!candidate.labels.every((label) => typeof label === "string")) return null;
    if (!candidate.values.every((value) => isNumber(value))) return null;

    return {
      type: "chart",
      chartType: candidate.chartType,
      labels: candidate.labels,
      values: candidate.values,
      animation: { type: "grow", duration: candidate.animation.duration },
    };
  }

  if (candidate.type === "flow") {
    if (
      !Array.isArray(candidate.nodes) ||
      !Array.isArray(candidate.edges) ||
      !isObject(candidate.animation) ||
      candidate.animation.type !== "step" ||
      !isNumber(candidate.animation.delay)
    ) {
      return null;
    }

    const nodes = candidate.nodes.filter(
      (node): node is { id: string; label: string } =>
        isObject(node) && typeof node.id === "string" && typeof node.label === "string"
    );

    const edges = candidate.edges.filter(
      (edge): edge is { from: string; to: string } =>
        isObject(edge) && typeof edge.from === "string" && typeof edge.to === "string"
    );

    if (nodes.length !== candidate.nodes.length || edges.length !== candidate.edges.length) {
      return null;
    }

    return {
      type: "flow",
      nodes,
      edges,
      animation: { type: "step", delay: candidate.animation.delay },
    };
  }

  if (candidate.type === "graph") {
    if (
      !Array.isArray(candidate.nodes) ||
      !Array.isArray(candidate.edges) ||
      candidate.layout !== "force" ||
      !isObject(candidate.animation) ||
      candidate.animation.type !== "expand"
    ) {
      return null;
    }

    const nodes = candidate.nodes.filter(
      (node): node is { id: string; label: string } =>
        isObject(node) && typeof node.id === "string" && typeof node.label === "string"
    );

    const edges = candidate.edges.filter(
      (edge): edge is { source: string; target: string } =>
        isObject(edge) && typeof edge.source === "string" && typeof edge.target === "string"
    );

    if (nodes.length !== candidate.nodes.length || edges.length !== candidate.edges.length) {
      return null;
    }

    return {
      type: "graph",
      nodes,
      edges,
      layout: "force",
      animation: { type: "expand" },
    };
  }

  return null;
}
