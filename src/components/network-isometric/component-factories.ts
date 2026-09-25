import { getComponentGeometry } from "./geometry/registry";
import {
  createId,
  type ComponentRole,
  type ComponentStatus,
  type ComponentType,
  type NetworkComponent,
  type Port,
  type Vec3,
} from "./model";

export type ComponentOptions = {
  id?: string;
  position?: Vec3;
  rotation?: number;
  scale?: number;
  label?: string;
  role?: ComponentRole;
  status?: ComponentStatus;
  /** Network devices only — how many ports to draw (defaults per type: Hub 4, Switch 8, Router 4, Modem 2). */
  portCount?: number;
};

const DEFAULT_LABELS: Record<ComponentType, string> = {
  desktop: "Computer",
  laptop: "Laptop",
  monitor: "Monitor",
  mainframe: "Mainframe",
  server: "Server",
  printer: "Printer",
  smartphone: "Phone",
  hub: "Hub",
  switch: "Switch",
  router: "Router",
  modem: "Modem",
  repeater: "Repeater",
  "access-point": "Access Point",
  message: "Message",
  "data-packet": "Packet",
  protocol: "Protocol",
  "arrow-forward": "",
  "arrow-reverse": "",
  "arrow-bidirectional": "",
};

const DEFAULT_PORT_COUNTS: Partial<Record<ComponentType, number>> = {
  hub: 4,
  switch: 8,
  router: 4,
  modem: 2,
};

/**
 * The one place every component is actually constructed. `DesktopComputer`,
 * `Hub`, `Message`, etc. below are thin, named wrappers over this — a
 * topology builder that needs to spawn a device it doesn't know the exact
 * type of ahead of time (e.g. "create 6 of whatever device type was asked
 * for") calls this directly instead of duplicating the wiring.
 */
export function createComponent(type: ComponentType, opts: ComponentOptions = {}): NetworkComponent {
  const id = opts.id ?? createId(type);
  const portCount = opts.portCount ?? DEFAULT_PORT_COUNTS[type];
  const geometry = getComponentGeometry(type, portCount);
  const ports: Port[] = geometry.ports.map((offset, index) => ({
    id: `${id}-port-${index}`,
    componentId: id,
    offset,
  }));

  let label = opts.label ?? DEFAULT_LABELS[type];
  if (opts.role && !opts.label) {
    label = `${label} (${opts.role === "sender" ? "Sender" : "Receiver"})`;
  }

  return {
    id,
    type,
    position: opts.position ?? { x: 0, y: 0, z: 0 },
    rotation: opts.rotation ?? 0,
    scale: opts.scale ?? 1,
    label,
    role: opts.role,
    status: opts.status ?? "idle",
    portCount,
    ports,
  };
}

// ---- End devices ----
export const DesktopComputer = (opts?: ComponentOptions) => createComponent("desktop", opts);
export const Laptop = (opts?: ComponentOptions) => createComponent("laptop", opts);
export const Monitor = (opts?: ComponentOptions) => createComponent("monitor", opts);
export const Mainframe = (opts?: ComponentOptions) => createComponent("mainframe", opts);
export const Server = (opts?: ComponentOptions) => createComponent("server", opts);
export const Printer = (opts?: ComponentOptions) => createComponent("printer", opts);
export const Smartphone = (opts?: ComponentOptions) => createComponent("smartphone", opts);

// ---- Network devices ----
export const Hub = (opts?: ComponentOptions) => createComponent("hub", opts);
export const Switch = (opts?: ComponentOptions) => createComponent("switch", opts);
export const Router = (opts?: ComponentOptions) => createComponent("router", opts);
export const Modem = (opts?: ComponentOptions) => createComponent("modem", opts);
export const Repeater = (opts?: ComponentOptions) => createComponent("repeater", opts);
export const AccessPoint = (opts?: ComponentOptions) => createComponent("access-point", opts);

// ---- Data objects ----
export const Message = (opts?: ComponentOptions) => createComponent("message", opts);
export const DataPacket = (opts?: ComponentOptions) => createComponent("data-packet", opts);
export const Protocol = (opts?: ComponentOptions) => createComponent("protocol", opts);

// ---- Direction markers ----
export const ArrowForward = (opts?: ComponentOptions) => createComponent("arrow-forward", opts);
export const ArrowReverse = (opts?: ComponentOptions) => createComponent("arrow-reverse", opts);
export const ArrowBidirectional = (opts?: ComponentOptions) => createComponent("arrow-bidirectional", opts);

/** A connection point on `component`, in local grid units from its base point. Every hardware component already exposes its default ports via `.ports`; use this only to add an extra one. */
export function NetworkPort(component: NetworkComponent, offset: Vec3, id?: string): Port {
  return { id: id ?? createId(`${component.id}-port`), componentId: component.id, offset };
}
