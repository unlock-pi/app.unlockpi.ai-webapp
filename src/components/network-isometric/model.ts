/**
 * Layer 1 data model — the shapes a diagram is built FROM. A diagram (Layer 3)
 * only ever assembles these; it never carries its own geometry.
 */

export type Vec3 = { x: number; y: number; z: number };

export const ENDPOINT_DEVICE_TYPES = [
  "desktop",
  "laptop",
  "monitor",
  "mainframe",
  "server",
  "printer",
  "smartphone",
] as const;

export const NETWORK_DEVICE_TYPES = [
  "hub",
  "switch",
  "router",
  "modem",
  "repeater",
  "access-point",
] as const;

export const DATA_OBJECT_TYPES = ["message", "data-packet", "protocol"] as const;

export const ARROW_TYPES = ["arrow-forward", "arrow-reverse", "arrow-bidirectional"] as const;

export type EndpointDeviceType = (typeof ENDPOINT_DEVICE_TYPES)[number];
export type NetworkDeviceType = (typeof NETWORK_DEVICE_TYPES)[number];
export type DataObjectType = (typeof DATA_OBJECT_TYPES)[number];
export type ArrowType = (typeof ARROW_TYPES)[number];

/** Every placeable thing in the scene — hardware, data objects, and direction markers alike. */
export type ComponentType = EndpointDeviceType | NetworkDeviceType | DataObjectType | ArrowType;

export type ComponentRole = "sender" | "receiver" | undefined;
export type ComponentStatus = "idle" | "active" | "error" | "offline";

/** A connection point on a component, in local (unrotated, unscaled) grid units from its base point. */
export type Port = {
  id: string;
  componentId: string;
  offset: Vec3;
};

export type NetworkComponent = {
  id: string;
  type: ComponentType;
  /** World-space base point, in grid units. */
  position: Vec3;
  /** Yaw around Z, radians. Every component keeps the same vertical orientation — only yaw varies. */
  rotation?: number;
  scale?: number;
  label?: string;
  role?: ComponentRole;
  status?: ComponentStatus;
  ports?: Port[];
  /** Network devices only — how many ports to draw (defaults per type). */
  portCount?: number;
  metadata?: Record<string, unknown>;
};

export type ConnectionType = "cable" | "backbone" | "fiber" | "coaxial" | "wireless";
export type ConnectionDirection = "forward" | "reverse" | "bidirectional" | "none";

export type NetworkConnection = {
  id: string;
  sourceComponentId: string;
  sourcePortId?: string;
  targetComponentId: string;
  targetPortId?: string;
  type: ConnectionType;
  direction?: ConnectionDirection;
  label?: string;
  /** 0 = fully at source, 1 = fully at target — drives an in-flight packet/stream marker. */
  flowProgress?: number;
};

export type LabelKind = "role" | "time" | "generic";

export type DiagramLabel = {
  id: string;
  text: string;
  position: Vec3;
  kind?: LabelKind;
  align?: "left" | "center" | "right";
};

export type NetworkDiagram = {
  components: NetworkComponent[];
  connections: NetworkConnection[];
  labels: DiagramLabel[];
};

let counter = 0;
/** Stable, readable ids (`desktop-1`, `cable-2`, ...) — not globally unique across page reloads, which is fine for a scene graph that's rebuilt from scratch each time a diagram is assembled. */
export function createId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function emptyDiagram(): NetworkDiagram {
  return { components: [], connections: [], labels: [] };
}

/** Merges any number of partial diagrams produced by builders into one scene graph. */
export function mergeDiagrams(...parts: Partial<NetworkDiagram>[]): NetworkDiagram {
  const out = emptyDiagram();
  for (const part of parts) {
    if (part.components) out.components.push(...part.components);
    if (part.connections) out.connections.push(...part.connections);
    if (part.labels) out.labels.push(...part.labels);
  }
  return out;
}
