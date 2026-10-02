"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";

import {
  GraphRenderer,
  addEdge,
  addNode,
  createGraph,
  createGraphPlaygroundState,
  clearGraphVisualState,
  findPath,
  getNeighbors,
  graphAdjacencyList,
  graphAdjacencyMatrix,
  highlightGraphElements,
  inspectEdge,
  inspectNode,
  pauseGraphExecution,
  resetGraphExecution,
  runBFS,
  runDFS,
  runDijkstra,
  runKruskal,
  runPrim,
  detectCycle,
  connectedComponents,
  topologicalSort,
  selectGraphElement,
  setGraphView,
  startGraphExecution,
  stepGraphExecution,
} from "@unlockpi/blocks/graph";
import type {
  GraphDisplayMode,
  GraphEdge,
  GraphModel,
  GraphOperationResult,
  GraphRuntimeState,
  GraphAlgorithmStep,
} from "@unlockpi/blocks/graph";
import { cn } from "@/lib/utils";

type Operation = (state: GraphRuntimeState) => GraphOperationResult<unknown>;
type Beat = { label: string; run: Operation };
type Sequence = {
  title: string;
  beats: Beat[];
  next: number;
  status: "running" | "paused";
  before: GraphRuntimeState;
};
type CommandId =
  | "build" | "neighbors" | "bfs" | "dfs" | "path" | "cycle"
  | "components" | "topological" | "dijkstra" | "prim" | "kruskal";

const COMMANDS: { id: CommandId; label: string }[] = [
  { id: "build", label: "Make a weighted graph with A, B, C and D." },
  { id: "neighbors", label: "Which nodes can we reach from A?" },
  { id: "bfs", label: "Start at A and visit the graph level by level." },
  { id: "dfs", label: "Start at A and go deep before coming back." },
  { id: "path", label: "Show the shortest path from A to D." },
  { id: "cycle", label: "Show me a loop in the graph." },
  { id: "components", label: "Show me the separate groups." },
  { id: "topological", label: "Put these tasks in the right order." },
  { id: "dijkstra", label: "Find the cheapest route from A to D." },
  { id: "prim", label: "Connect every node for the lowest cost, starting at A." },
  { id: "kruskal", label: "Choose the cheapest links without making a loop." },
];

const POSITIONS = {
  A: { x: 210, y: 180 },
  B: { x: 465, y: 130 },
  C: { x: 465, y: 410 },
  D: { x: 750, y: 180 },
  E: { x: 750, y: 410 },
};

function exampleGraph(): GraphModel {
  const ids = ["A", "B", "C", "D"] as const;
  const edges = [["A", "B", 2], ["A", "C", 4], ["B", "C", 1], ["C", "D", 3]] as const;
  return {
    id: "example-weighted",
    directed: false,
    weighted: true,
    nodes: ids.map((nodeId) => ({ id: nodeId, label: nodeId, position: POSITIONS[nodeId] })),
    edges: edges.map(([source, target, weight], index): GraphEdge => ({
      id: "edge-" + index, source, target, directed: false, weight,
    })),
  };
}

function buildBeats(graph: GraphModel): Beat[] {
  return [
    { label: "Prepare the graph", run: () => createGraph({ id: graph.id, directed: graph.directed, weighted: graph.weighted }) },
    ...graph.nodes.map((node): Beat => ({
      label: "Add node " + node.id,
      run: (state) => addNode(state, { id: node.id, label: node.label, position: node.position }),
    })),
    ...graph.edges.map((edge): Beat => ({
      label: "Draw " + edge.source + " to " + edge.target,
      run: (state) => addEdge(state, edge),
    })),
  ];
}

function algorithmFor(id: Exclude<CommandId, "build" | "neighbors">, source: string, target: string): Operation {
  switch (id) {
    case "bfs": return (state) => runBFS(state, { startNode: source });
    case "dfs": return (state) => runDFS(state, { startNode: source });
    case "path": return (state) => state.graph.weighted
      ? runDijkstra(state, { source, target })
      : findPath(state, { source, target });
    case "cycle": return detectCycle;
    case "components": return connectedComponents;
    case "topological": return topologicalSort;
    case "dijkstra": return (state) => runDijkstra(state, { source, target });
    case "prim": return (state) => runPrim(state, { startNode: source });
    case "kruskal": return runKruskal;
  }
}

function commandEndpoints(graph: GraphModel) {
  const source = graph.nodes.find((node) => node.id === "A")?.id ?? graph.nodes[0]?.id ?? "A";
  const target = graph.nodes.find((node) => node.id === "D")?.id
    ?? graph.nodes.findLast((node) => node.id !== source)?.id
    ?? source;
  return { source, target };
}

function commandLabel(id: CommandId, graph: GraphModel) {
  const label = COMMANDS.find((item) => item.id === id)?.label ?? "Graph demonstration";
  if (id === "build") return label;
  const { source, target } = commandEndpoints(graph);
  return label.replace(/\b(A|D)\b/g, (match) => match === "A" ? source : target);
}

function playbackDelay(type?: string) {
  switch (type) {
    case "traverse_edge":
      return 2150;
    case "relax_edge":
    case "accept_edge":
    case "reject_edge":
      return 1250;
    case "initialize":
    case "complete":
    case "cycle_detected":
      return 1500;
    default:
      return 1100;
  }
}

function teachingDescription(step: GraphAlgorithmStep, graph: GraphModel) {
  const edge = graph.edges.find((item) => item.id === step.currentEdgeId);
  const from = step.fromNodeId ?? edge?.source;
  const to = step.toNodeId ?? edge?.target;
  if (step.type === "traverse_edge" && edge && from && to) {
    if (step.distances && edge.weight !== undefined) {
      const distanceSoFar = step.distances[from];
      const currentBest = step.distances[to];
      if (distanceSoFar !== null && distanceSoFar !== undefined) {
        const candidate = distanceSoFar + edge.weight;
        if (currentBest !== null && currentBest !== undefined && candidate >= currentBest) {
          return "Going through " + from + " would cost " + candidate + ". We already have " + currentBest + " for " + to + ", so keep it.";
        }
        return "Try " + from + " → " + to + ": " + distanceSoFar + " so far, plus " + edge.weight + " = " + candidate + ".";
      }
    }
    const cost = graph.weighted && edge.weight !== undefined ? " (cost " + edge.weight + ")" : "";
    return "Let's look at " + from + " → " + to + cost + ".";
  }
  if (step.type === "relax_edge" && step.currentNodeId) {
    return "That's a better route to " + step.currentNodeId + ": total cost " + (step.distances?.[step.currentNodeId] ?? "∞") + ".";
  }
  if (step.type === "accept_edge" && edge) {
    return "Keep " + edge.source + " — " + edge.target + ". The total is now " + step.totalWeight + ".";
  }
  if (step.type === "reject_edge" && edge) {
    return "Skip " + edge.source + " — " + edge.target + "; it would make a loop.";
  }
  if (step.type === "discover_node" && step.currentNodeId && step.queue) {
    return "We've found " + step.currentNodeId + ". Add it to the queue for later.";
  }
  return step.description;
}

function AdjacencyList({ graph }: { graph: GraphModel }) {
  return (
    <div className="grid min-h-[26rem] content-center gap-3 rounded-xl border border-border bg-card p-5 font-mono text-sm">
      {graphAdjacencyList(graph).map(({ node, neighbors }) => (
        <p key={node.id} className="border-b border-border py-2">
          <span className="font-bold">{node.label}</span>
          <span className="mx-3 text-muted-foreground">{graph.directed ? "→" : "—"}</span>
          {neighbors.length ? neighbors.map(({ node: neighbor, edge }) => neighbor.label + (edge.weight === undefined ? "" : " (" + edge.weight + ")")).join(", ") : "∅"}
        </p>
      ))}
    </div>
  );
}

function AdjacencyMatrix({ graph }: { graph: GraphModel }) {
  const matrix = graphAdjacencyMatrix(graph);
  return (
    <div className="min-h-[26rem] overflow-auto rounded-xl border border-border bg-card p-5">
      <table className="mx-auto border-separate border-spacing-2 text-center font-mono text-sm">
        <thead><tr><th />{graph.nodes.map((node) => <th key={node.id} className="min-w-12">{node.label}</th>)}</tr></thead>
        <tbody>{matrix.map((row, index) => (
          <tr key={graph.nodes[index]?.id}>
            <th>{graph.nodes[index]?.label}</th>
            {row.map((edges, column) => <td key={column} className={cn("min-w-12 rounded-md px-2 py-1.5", edges.length ? "bg-primary/15 text-primary" : "text-muted-foreground")}>{edges.length ? graph.weighted ? edges.map((edge) => edge.weight ?? 1).join(", ") : "1" : "0"}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function advanceSequence(
  sequenceRef: RefObject<Sequence | null>,
  stateRef: RefObject<GraphRuntimeState>,
  setSequence: Dispatch<SetStateAction<Sequence | null>>,
  publishResult: (result: GraphOperationResult<unknown>) => boolean,
  automatic: boolean,
) {
  const current = sequenceRef.current;
  if (!current) return;
  const beat = current.beats[current.next];
  if (!beat) return;
  const result = beat.run(stateRef.current);
  if (!publishResult(result)) {
    const paused = { ...current, status: "paused" as const };
    sequenceRef.current = paused;
    setSequence(paused);
    return;
  }
  const nextIndex = current.next + 1;
  const next = nextIndex === current.beats.length ? null : {
    ...current,
    next: nextIndex,
    status: automatic ? "running" as const : "paused" as const,
  };
  sequenceRef.current = next;
  setSequence(next);
}

export default function GraphPlaygroundPage() {
  const [state, setState] = useState<GraphRuntimeState>(createGraphPlaygroundState);
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [message, setMessage] = useState("Choose a teaching instruction below.");
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const sequenceRef = useRef(sequence);
  const timerRef = useRef<number | null>(null);

  const publishSequence = (next: Sequence | null) => {
    sequenceRef.current = next;
    setSequence(next);
  };

  const publishResult = useCallback((result: GraphOperationResult<unknown>) => {
    if (!result.ok) {
      setError(result.error ?? result.summary);
      return false;
    }
    if (result.state) {
      stateRef.current = result.state;
      setState(result.state);
    }
    setError(null);
    setMessage(result.state?.execution.algorithmStep
      ? teachingDescription(result.state.execution.algorithmStep, result.state.graph)
      : result.summary);
    return true;
  }, []);

  useEffect(() => {
    if (sequence?.status === "running") {
      timerRef.current = window.setTimeout(() => advanceSequence(sequenceRef, stateRef, setSequence, publishResult, true), 1000);
    } else if (!sequence && state.execution.status === "running" && state.execution.algorithmSteps?.length) {
      timerRef.current = window.setTimeout(() => {
        publishResult(stepGraphExecution(stateRef.current, { auto: true }));
      }, playbackDelay(state.execution.algorithmStep?.type));
    }
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [sequence, state.execution.currentStep, state.execution.status, state.execution.algorithmSteps?.length, state.execution.algorithmStep?.type, publishResult]);

  const command = (id: CommandId) => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const before = stateRef.current;
    const title = commandLabel(id, before.graph);
    if (id === "build") {
      setError(null);
      setMessage(title);
      publishSequence({ title, beats: buildBeats(exampleGraph()), next: 0, status: "running", before });
      return;
    }
    if (id === "neighbors") {
      const { source } = commandEndpoints(before.graph);
      const beats: Beat[] = [
        { label: "Clear old markings", run: clearGraphVisualState },
        {
          label: "Show the neighbors of " + source,
          run: (current) => {
            const neighbors = getNeighbors(current, source);
            if (!neighbors.ok) return neighbors;
            const nodeIds = [source, ...(neighbors.data ?? []).map((node) => node.id)];
            const edgeIds = current.graph.edges
              .filter((edge) => edge.source === source || (!edge.directed && edge.target === source))
              .map((edge) => edge.id);
            return highlightGraphElements(current, { nodeIds, edgeIds });
          },
        },
      ];
      setError(null);
      setMessage(title);
      publishSequence({ title, beats, next: 0, status: "running", before });
      return;
    }
    publishSequence(null);
    const { source, target } = commandEndpoints(before.graph);
    const result = algorithmFor(id, source, target)(before);
    if (result.ok && result.state && before.view.displayMode !== "graph") {
      const graphView = setGraphView(result.state, "graph");
      publishResult({ ...result, state: graphView.state ?? result.state });
    } else {
      publishResult(result);
    }
  };

  const pauseOrPlay = () => {
    if (sequenceRef.current) {
      publishSequence({ ...sequenceRef.current, status: sequenceRef.current.status === "running" ? "paused" : "running" });
      return;
    }
    publishResult(stateRef.current.execution.status === "running"
      ? pauseGraphExecution(stateRef.current)
      : startGraphExecution(stateRef.current));
  };

  const step = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (sequenceRef.current) {
      advanceSequence(sequenceRef, stateRef, setSequence, publishResult, false);
      return;
    }
    publishResult(stepGraphExecution(stateRef.current));
  };

  const reset = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (sequenceRef.current) {
      const before = sequenceRef.current.before;
      publishSequence(null);
      stateRef.current = before;
      setState(before);
      setMessage("Demonstration reset.");
      setError(null);
      return;
    }
    publishResult(resetGraphExecution(stateRef.current));
  };

  const changeView = (view: GraphDisplayMode) => {
    if (sequenceRef.current?.status === "running") publishSequence({ ...sequenceRef.current, status: "paused" });
    if (stateRef.current.execution.status === "running") publishResult(pauseGraphExecution(stateRef.current));
    publishResult(setGraphView(stateRef.current, view));
  };

  const select = ({ nodeId, edgeId }: { nodeId: string | null; edgeId: string | null }) => {
    publishResult(selectGraphElement(stateRef.current, nodeId ? { type: "node", id: nodeId } : edgeId ? { type: "edge", id: edgeId } : null));
  };

  const mode = state.view.displayMode ?? "graph";
  const activeStep = state.execution.algorithmStep;
  const finished = !sequence && state.execution.status === "complete";
  const progress = sequence
    ? { current: sequence.next, total: sequence.beats.length, playing: sequence.status === "running" }
    : state.execution.algorithmSteps?.length
      ? { current: state.execution.currentStep ?? 0, total: state.execution.totalSteps ?? 0, playing: state.execution.status === "running" }
      : null;
  const selectedNode = state.view.selectedNodeId ? inspectNode(state, state.view.selectedNodeId).data : null;
  const selectedEdge = state.view.selectedEdgeId ? inspectEdge(state, { id: state.view.selectedEdgeId }).data : null;

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Graph playground</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose what to demonstrate. Watch each step on the graph.</p>
          </div>
          <span className="text-xs text-muted-foreground">{state.graph.directed ? "Directed" : "Undirected"} · {state.graph.weighted ? "Weighted" : "Unweighted"}</span>
        </div>

        <div className="mb-3 flex flex-wrap gap-1 border-b border-border" role="tablist" aria-label="Graph view">
          {([ ["graph", "Graph"], ["list", "List"], ["matrix", "Matrix"] ] as const).map(([view, label]) => (
            <button key={view} type="button" role="tab" aria-selected={mode === view} onClick={() => changeView(view)} className={cn("border-b-2 px-3 py-2 text-sm transition-colors", mode === view ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{label}</button>
          ))}
        </div>

        {mode === "graph" ? <GraphRenderer graph={state.graph} viewState={state.view} execution={state.execution} event={state.events.at(-1)} onSelect={select} /> : mode === "list" ? <AdjacencyList graph={state.graph} /> : <AdjacencyMatrix graph={state.graph} />}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4" aria-live="polite">
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium", error && "text-destructive")}>{error ?? message}</p>
            {progress ? <p className="mt-1 text-xs text-muted-foreground">Step {progress.current} of {progress.total}{finished ? " · Finished" : progress.playing ? " · Playing" : " · Paused"}</p> : null}
          </div>
          {progress ? <div className="flex items-center gap-2 text-sm">
            <button type="button" onClick={pauseOrPlay} className="px-2 py-1 font-medium text-foreground hover:text-primary">{progress.playing ? "Pause" : finished ? "Replay" : "Play"}</button>
            <button type="button" onClick={step} disabled={progress.current >= progress.total} className="px-2 py-1 font-medium text-foreground hover:text-primary disabled:opacity-35">Step</button>
            <button type="button" onClick={reset} className="px-2 py-1 text-muted-foreground hover:text-foreground">Reset</button>
          </div> : null}
        </div>

        {activeStep ? <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-border py-3 text-xs text-muted-foreground">
          {activeStep.queue ? <span>Queue: {activeStep.queue.join(" → ") || "empty"}</span> : null}
          {activeStep.stack ? <span>Stack: {activeStep.stack.join(" → ") || "empty"}</span> : null}
          {activeStep.visitedNodeIds ? <span>Visited: {activeStep.visitedNodeIds.join(", ") || "none"}</span> : null}
          {activeStep.output?.length ? <span>Order: {activeStep.output.join(" → ")}</span> : null}
          {activeStep.distances ? <span>Distances: {Object.entries(activeStep.distances).map(([id, value]) => id + " " + (value ?? "∞")).join(" · ")}</span> : null}
          {activeStep.totalWeight !== undefined ? <span>Total cost: {activeStep.totalWeight}</span> : null}
          {activeStep.acceptedEdgeIds?.length ? <span>Chosen edges: {activeStep.acceptedEdgeIds.length}</span> : null}
          {activeStep.rejectedEdgeIds?.length ? <span>Skipped edges: {activeStep.rejectedEdgeIds.length}</span> : null}
        </div> : null}

        {selectedNode || selectedEdge ? <div className="border-b border-border py-3 text-sm text-muted-foreground">
          {selectedNode ? <span>Node {selectedNode.label} · {selectedNode.neighbors.length} neighbor{selectedNode.neighbors.length === 1 ? "" : "s"}: {selectedNode.neighbors.map((node) => node.label).join(", ") || "none"}</span> : null}
          {selectedEdge ? <span>{selectedEdge.source} {selectedEdge.directed ? "→" : "—"} {selectedEdge.target}{selectedEdge.weight !== undefined ? " · Weight " + selectedEdge.weight : ""}</span> : null}
        </div> : null}

        <section className="py-6" aria-label="Teaching commands">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Try saying</h2>
          <div className="grid gap-x-8 sm:grid-cols-2">
            {COMMANDS.map((item) => (
              <button key={item.id} type="button" onClick={() => command(item.id)} className="border-b border-border py-3 text-left text-sm text-foreground transition-colors hover:border-primary hover:text-primary">“{commandLabel(item.id, state.graph)}”</button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
