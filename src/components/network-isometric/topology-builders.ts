import { createComponent, Hub, type ComponentOptions } from "./component-factories";
import { BackboneCable, NetworkCable } from "./connection-factories";
import { NetworkLabel, RoleLabel, TimeLabel } from "./label-factories";
import { mergeDiagrams, type ComponentType, type NetworkComponent, type NetworkDiagram } from "./model";

/** A device that hasn't been placed yet — a topology builder decides its position. Pass a real `NetworkComponent` instead when you need control over anything else (role, custom label, an existing instance to reuse). */
export type DeviceSpec = { type: ComponentType; label?: string } | NetworkComponent;

function isPlaced(device: DeviceSpec): device is NetworkComponent {
  return "ports" in device;
}

/** Resolves a spec to a real component, then places it — the topology builder always owns layout, whether the caller handed it a bare spec or an existing component. */
function place(device: DeviceSpec, position: NetworkComponent["position"], extra?: ComponentOptions): NetworkComponent {
  const component = isPlaced(device)
    ? device
    : createComponent(device.type, { ...extra, label: device.label ?? extra?.label });
  component.position = position;
  return component;
}

function circleLayout(count: number, radius: number, centerX = 0, centerY = 0) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius, z: 0 };
  });
}

// ---------------------------------------------------------------------------
// Layer 3, section A-C: the three duplex/transmission-mode diagrams. Same two
// devices and one medium every time — only the arrow direction changes.
// ---------------------------------------------------------------------------

export function createSimplex(sender: DeviceSpec, receiver: DeviceSpec): NetworkDiagram {
  const from = place(sender, { x: 0, y: 0, z: 0 }, { role: "sender" });
  const to = place(receiver, { x: 3, y: 0, z: 0 }, { role: "receiver" });

  const medium = NetworkCable(from, to, { direction: "forward", label: "Medium" });
  const message = createComponent("message", { position: { x: 1.4, y: -0.7, z: 0.25 }, label: "Message" });
  const protocol = createComponent("protocol", { position: { x: -0.2, y: -1.3, z: 0 }, label: "Protocol" });

  return mergeDiagrams(
    { components: [from, to, message, protocol], connections: [medium] },
    {
      labels: [
        RoleLabel("sender", { x: 0.5, y: 0.6, z: 1.3 }),
        RoleLabel("receiver", { x: 3.5, y: 0.6, z: 1.3 }),
        NetworkLabel("Simplex — one direction only", { x: 1.5, y: 0, z: 1.7 }),
      ],
    },
  );
}

export function createHalfDuplex(deviceA: DeviceSpec, deviceB: DeviceSpec, activeTime: 1 | 2 = 1): NetworkDiagram {
  const a = place(deviceA, { x: 0, y: 0, z: 0 });
  const b = place(deviceB, { x: 3, y: 0, z: 0 });

  const medium = NetworkCable(a, b, {
    direction: activeTime === 1 ? "forward" : "reverse",
    label: "Medium",
  });

  return mergeDiagrams(
    { components: [a, b], connections: [medium] },
    {
      labels: [
        TimeLabel(activeTime, { x: 1.5, y: 0, z: 1.5 }),
        NetworkLabel("Half-Duplex — one direction at a time", { x: 1.5, y: 0, z: 1.8 }),
      ],
    },
  );
}

export function createFullDuplex(deviceA: DeviceSpec, deviceB: DeviceSpec): NetworkDiagram {
  const a = place(deviceA, { x: 0, y: 0, z: 0 });
  const b = place(deviceB, { x: 3, y: 0, z: 0 });

  const medium = NetworkCable(a, b, { direction: "bidirectional", label: "Medium" });

  return mergeDiagrams(
    { components: [a, b], connections: [medium] },
    { labels: [NetworkLabel("Full-Duplex — both directions at once", { x: 1.5, y: 0, z: 1.5 })] },
  );
}

// ---------------------------------------------------------------------------
// Layer 3, section D-E: connection topologies.
// ---------------------------------------------------------------------------

export function createPointToPoint(deviceA: DeviceSpec, deviceB: DeviceSpec): NetworkDiagram {
  const a = place(deviceA, { x: 0, y: 0, z: 0 });
  const b = place(deviceB, { x: 3, y: 0, z: 0 });
  return { components: [a, b], connections: [NetworkCable(a, b)], labels: [] };
}

/** Lays devices along a shared backbone — the basis for both Multipoint and Bus (a Bus *is* a multipoint topology). */
export function createMultipoint(devices: DeviceSpec[]): NetworkDiagram {
  const spacing = 2.4;
  const placed = devices.map((device, i) => place(device, { x: i * spacing, y: i % 2 === 0 ? -1.3 : 1.3, z: 0 }));

  const connections = [];
  for (let i = 0; i < placed.length - 1; i++) {
    connections.push(BackboneCable(placed[i], placed[i + 1], { label: i === 0 ? "Backbone" : undefined }));
  }

  return {
    components: placed,
    connections,
    labels: [NetworkLabel("Multipoint — one shared medium", { x: ((placed.length - 1) * spacing) / 2, y: 0, z: 1.6 })],
  };
}

// ---------------------------------------------------------------------------
// Layer 3, section 11: network topology builders.
// ---------------------------------------------------------------------------

export function createMeshTopology(devices: DeviceSpec[]): NetworkDiagram {
  const radius = Math.max(2.2, devices.length * 0.55);
  const positions = circleLayout(devices.length, radius);
  const placed = devices.map((device, i) => place(device, positions[i]));

  const connections = [];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      connections.push(NetworkCable(placed[i], placed[j], { direction: "bidirectional" }));
    }
  }

  return { components: placed, connections, labels: [NetworkLabel("Mesh — every device connects to every other", { x: 0, y: 0, z: radius + 1.2 })] };
}

export function createStarTopology(devices: DeviceSpec[], hub: DeviceSpec = Hub()): NetworkDiagram {
  const centerHub = place(hub, { x: 0, y: 0, z: 0 });

  const radius = Math.max(2.4, devices.length * 0.5);
  const positions = circleLayout(devices.length, radius);
  const placed = devices.map((device, i) => place(device, positions[i]));

  const connections = placed.map((device) => NetworkCable(centerHub, device));

  return {
    components: [centerHub, ...placed],
    connections,
    labels: [NetworkLabel("Star — every device connects to the hub", { x: 0, y: 0, z: radius + 1.3 })],
  };
}

export const createBusTopology = (devices: DeviceSpec[]) => {
  const diagram = createMultipoint(devices);
  diagram.labels = [
    NetworkLabel(
      "Bus — one backbone shared by every device",
      diagram.labels[0]?.position ?? { x: 0, y: 0, z: 1.6 },
    ),
  ];
  return diagram;
};

export function createRingTopology(devices: DeviceSpec[]): NetworkDiagram {
  const radius = Math.max(2.2, devices.length * 0.5);
  const positions = circleLayout(devices.length, radius);
  const placed = devices.map((device, i) => place(device, positions[i]));

  const connections = placed.map((device, i) =>
    NetworkCable(device, placed[(i + 1) % placed.length], { direction: "forward" }),
  );

  return {
    components: placed,
    connections,
    labels: [NetworkLabel("Ring — each device connects to the next, looping back", { x: 0, y: 0, z: radius + 1.2 })],
  };
}

export function createMultipointTopology(devices: DeviceSpec[]): NetworkDiagram {
  return createMultipoint(devices);
}

/** Spawns `count` devices of one type — the primitive behind "create 5 laptops in a mesh". */
export function repeatDevice(type: ComponentType, count: number, labelPrefix?: string): DeviceSpec[] {
  return Array.from({ length: count }, (_, i) => ({ type, label: labelPrefix ? `${labelPrefix} ${i + 1}` : undefined }));
}
