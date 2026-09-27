"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "reactflow";
import "reactflow/dist/style.css";

import { byId, LINKS, type DeviceGroup, type LinkKind, type TopoScene } from "@/features/topologies/lib/topology-kit";
import { cn } from "@/lib/utils";

type Props = {
  scene: TopoScene;
  /** True while data should visibly travel along every link. */
  animating?: boolean;
  className?: string;
};

const GROUP_COLOR: Record<DeviceGroup, string> = {
  Endpoints: "#2E78D8",
  Network: "#0F9E95",
  "Compute & data": "#7657F2",
  "Scene & links": "#7E8896",
};

type DeviceNodeData = { label: string; typeName: string; group: DeviceGroup };

function DeviceNode({ data }: NodeProps<DeviceNodeData>) {
  const color = GROUP_COLOR[data.group];
  return (
    <div
      className="min-w-[104px] rounded-lg border-2 bg-card px-3 py-2 text-center shadow-sm"
      style={{ borderColor: color }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <div className="text-[9px] font-semibold uppercase tracking-wide" style={{ color }}>
        {data.typeName}
      </div>
      <div className="truncate text-xs font-medium text-foreground">{data.label}</div>
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

type FlowEdgeData = { kind: LinkKind; animated: boolean; label?: string };

/**
 * A straight link with an SVG `<animateMotion>` dot riding along it — native
 * SVG animation, so it plays reliably without a render loop or any React
 * state ticking every frame.
 */
function FlowEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<FlowEdgeData>) {
  const path = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  const kind = data?.kind ?? "ethernet";
  const meta = LINKS[kind] ?? LINKS.ethernet;
  const dashed = "dotted" in meta && meta.dotted;

  return (
    <>
      <path
        id={id}
        d={path}
        fill="none"
        stroke={meta.hex}
        strokeWidth={2}
        strokeDasharray={dashed ? "2 6" : undefined}
        strokeLinecap="round"
        className="react-flow__edge-path"
      />
      {data?.animated ? (
        <circle r={4.5} fill={meta.hex}>
          <animateMotion dur="1.4s" repeatCount="indefinite" path={path} />
        </circle>
      ) : null}
      {data?.label ? (
        <text x={(sourceX + targetX) / 2} y={(sourceY + targetY) / 2 - 6} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          {data.label}
        </text>
      ) : null}
    </>
  );
}

const nodeTypes = { device: DeviceNode };
const edgeTypes = { flow: FlowEdge };

const COL = 150;
const ROW = 120;

/**
 * A schematic (non-isometric) node-link diagram of the same scene the
 * isometric board renders, purpose-built to make data movement legible:
 * every link can carry a traveling dot, driven by native SVG animation
 * rather than a canvas redraw loop.
 */
export function TopologyFlowView({ scene, animating = false, className }: Props) {
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node<DeviceNodeData>[] = scene.nodes.map((n) => {
      const def = byId[n.type];
      return {
        id: n.id,
        type: "device",
        position: { x: n.x * COL, y: n.y * ROW },
        data: { label: n.label ?? def?.name ?? n.type, typeName: def?.name ?? n.type, group: def?.group ?? "Endpoints" },
      };
    });

    // A link with `to` (a fixed point, no target node — TopoKit's drop-cable-onto-a-backbone
    // shape) has nothing to visually connect to in a node-link diagram, so it is redrawn
    // here as an edge to the backbone's own endpoint instead.
    const backbone = scene.links.find((l) => l.b);
    const hubId = backbone?.a;

    const flowEdges: Edge<FlowEdgeData>[] = scene.links.flatMap((l, i) => {
      const target = l.b ?? hubId;
      if (!target) return [];
      return [
        {
          id: `link-${i}`,
          source: l.a,
          target,
          type: "flow",
          data: { kind: l.kind, animated: animating, label: l.label },
        },
      ];
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [scene, animating]);

  // Remounting (and re-fitting the view) only when the SET of devices changes —
  // not on every animation tick or label edit — keeps the teacher's pan/zoom
  // stable while packets are moving.
  const flowKey = useMemo(() => scene.nodes.map((n) => n.id).sort().join("|"), [scene.nodes]);

  if (scene.nodes.length === 0) {
    return (
      <div className={cn("flex h-[22rem] items-center justify-center rounded-xl border border-border/60 bg-muted/10 px-6 text-center", className)}>
        <p className="text-sm text-muted-foreground">No topology on the board yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("h-[22rem] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/10", className)}>
      <ReactFlow
        key={flowKey}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
