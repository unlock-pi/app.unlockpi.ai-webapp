import { createId, type ConnectionDirection, type ConnectionType, type NetworkComponent, type NetworkConnection } from "./model";

export type ConnectionOptions = {
  id?: string;
  direction?: ConnectionDirection;
  label?: string;
  /** Which of the component's ports to use, by index — defaults to its first port. */
  sourcePortIndex?: number;
  targetPortIndex?: number;
};

function makeConnection(
  type: ConnectionType,
  source: NetworkComponent,
  target: NetworkComponent,
  opts: ConnectionOptions,
): NetworkConnection {
  return {
    id: opts.id ?? createId(type),
    sourceComponentId: source.id,
    sourcePortId: source.ports?.[opts.sourcePortIndex ?? 0]?.id,
    targetComponentId: target.id,
    targetPortId: target.ports?.[opts.targetPortIndex ?? 0]?.id,
    type,
    direction: opts.direction ?? "none",
    label: opts.label,
  };
}

/** A copper Ethernet-style cable — the default connection between any two compatible ports. */
export const NetworkCable = (source: NetworkComponent, target: NetworkComponent, opts: ConnectionOptions = {}) =>
  makeConnection("cable", source, target, opts);

/** A shared spine multiple devices tap into — Bus and Multipoint topologies are built from a chain of these. */
export const BackboneCable = (source: NetworkComponent, target: NetworkComponent, opts: ConnectionOptions = {}) =>
  makeConnection("backbone", source, target, opts);

export const FiberCable = (source: NetworkComponent, target: NetworkComponent, opts: ConnectionOptions = {}) =>
  makeConnection("fiber", source, target, opts);

export const CoaxialCable = (source: NetworkComponent, target: NetworkComponent, opts: ConnectionOptions = {}) =>
  makeConnection("coaxial", source, target, opts);

/** No physical cable — rendered as traveling signal arcs between the two devices. */
export const WirelessLink = (source: NetworkComponent, target: NetworkComponent, opts: ConnectionOptions = {}) =>
  makeConnection("wireless", source, target, opts);

/** Marks a connection as carrying a continuous flow and sets how far along it the flow currently is (0..1). */
export function DataStream(connection: NetworkConnection, progress: number): NetworkConnection {
  connection.flowProgress = Math.max(0, Math.min(1, progress));
  return connection;
}
