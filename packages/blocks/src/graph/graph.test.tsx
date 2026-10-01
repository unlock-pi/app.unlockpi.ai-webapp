import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { GraphRenderer } from "./graph";
import {
  addEdge,
  addNode,
  createGraph,
  createGraphRuntimeState,
  getNeighbors,
  findPath,
  highlightGraphElements,
  inspectEdge,
  inspectNode,
  removeEdge,
  runBFS,
  runDijkstra,
  runKruskal,
  selectGraphElement,
  startGraphExecution,
  stepGraphExecution,
  updateEdge,
} from "./operations";
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
import type { GraphEdge, GraphModel } from "./types";

function graph(
  directed: boolean,
  weighted: boolean,
  ids: string[],
  edges: Array<[string, string, number?]>,
): GraphModel {
  return {
    id: "test",
    directed,
    weighted,
    nodes: ids.map((id, index) => ({ id, label: id, position: { x: 150 + index * 130, y: 200 } })),
    edges: edges.map(([source, target, weight], index): GraphEdge => ({
      id: "e" + index, source, target, directed, weight,
    })),
  };
}

const dag = graph(true, false, ["A", "B", "C", "D"], [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]]);
const weighted = graph(false, true, ["A", "B", "C", "D"], [["A", "B", 2], ["A", "C", 4], ["B", "C", 1], ["C", "D", 3]]);

describe("graph playground operations", () => {
  test("construction, inspection and visual emphasis stay separate", () => {
    let state = createGraph({ directed: false, weighted: true }).state!;
    state = addNode(state, { id: "A", position: { x: 100, y: 100 } }).state!;
    state = addNode(state, { id: "B", position: { x: 300, y: 100 } }).state!;
    expect(addNode(state, { id: "A", position: { x: 100, y: 100 } }).ok).toBe(false);
    state = addEdge(state, { id: "ab", source: "A", target: "B", weight: 2 }).state!;
    state = updateEdge(state, { id: "ab", weight: 5 }).state!;
    expect(inspectEdge(state, { id: "ab" }).data?.weight).toBe(5);
    expect(inspectNode(state, "A").data?.neighbors.map((node) => node.id)).toEqual(["B"]);
    expect(getNeighbors(state, "B").data?.map((node) => node.id)).toEqual(["A"]);
    state = selectGraphElement(state, { type: "node", id: "A" }).state!;
    state = highlightGraphElements(state, { nodeIds: ["B"], edgeIds: ["ab"] }).state!;
    expect(state.view.selectedNodeId).toBe("A");
    expect(state.view.highlightedNodeIds).toEqual(["B"]);
    expect(removeEdge(state, { source: "B", target: "A" }).state?.graph.edges).toHaveLength(0);
  });

  test("all nine algorithms produce ordered, serializable intermediate steps", () => {
    const cycle = graph(true, false, ["A", "B", "C"], [["A", "B"], ["B", "C"], ["C", "A"]]);
    const groups = graph(false, false, ["A", "B", "C", "D", "E"], [["A", "B"], ["B", "C"], ["D", "E"]]);
    const outcomes = [
      buildBfs(dag, { startNode: "A" }),
      buildDfs(dag, { startNode: "A" }),
      buildFindPath(dag, { source: "A", target: "D" }),
      buildCycleDetection(cycle),
      buildConnectedComponents(groups),
      buildTopologicalSort(dag),
      buildDijkstra(weighted, { source: "A", target: "D" }),
      buildPrim(weighted, { startNode: "A" }),
      buildKruskal(weighted),
    ];
    for (const outcome of outcomes) {
      expect(outcome.steps.length).toBeGreaterThan(1);
      expect(outcome.steps.map((step) => step.index)).toEqual(outcome.steps.map((_, index) => index + 1));
      expect(typeof JSON.stringify(outcome.steps)).toBe("string");
    }
    expect(outcomes[2].pathNodeIds).toEqual(["A", "B", "D"]);
    expect(outcomes[3].cycleEdgeIds).toHaveLength(3);
    expect(outcomes[4].components).toHaveLength(2);
    expect(outcomes[5].ordering).toHaveLength(4);
    expect(outcomes[6].distances?.D).toBe(6);
    expect(outcomes[7].totalWeight).toBe(6);
    expect(outcomes[8].rejectedEdgeIds).toHaveLength(1);
  });

  test("final path and tree highlights appear only at the relevant step", () => {
    let state = runDijkstra(createGraphRuntimeState(weighted), { source: "A", target: "D" }).state!;
    expect(state.execution.pathEdgeIds).toEqual([]);
    state = stepGraphExecution(state).state!;
    expect(state.execution.status).toBe("paused");
    state = startGraphExecution(state).state!;
    while (state.execution.status === "running") state = stepGraphExecution(state, { auto: true }).state!;
    expect(state.execution.pathEdgeIds).toHaveLength(3);
    state = startGraphExecution(state).state!;
    expect(state.execution.currentStep).toBe(1);
    expect(state.execution.pathEdgeIds).toEqual([]);
    const tree = runKruskal(createGraphRuntimeState(weighted)).state!;
    expect(tree.execution.acceptedEdgeIds).toEqual([]);
  });

  test("mixed edges do not produce a false cycle from walking back over one link", () => {
    const mixed = graph(true, false, ["A", "B"], []);
    mixed.edges = [{ id: "ab", source: "A", target: "B", directed: false }];
    expect(buildCycleDetection(mixed).cycleNodeIds).toEqual([]);
    mixed.edges.push({ id: "ab2", source: "A", target: "B", directed: false });
    expect(buildCycleDetection(mixed).cycleEdgeIds).toHaveLength(2);
  });

  test("re-running a route keeps the exact graph model and positions", () => {
    const initial = createGraphRuntimeState(weighted);
    const first = runDijkstra(initial, { source: "A", target: "D" }).state!;
    const again = runDijkstra(first, { source: "B", target: "D" }).state!;
    expect(first.graph).toBe(weighted);
    expect(again.graph).toBe(weighted);
    expect(again.graph.nodes).toBe(weighted.nodes);
    expect(again.execution.currentStep).toBe(1);
    const unweighted = createGraphRuntimeState(dag);
    expect(findPath(unweighted, { source: "A", target: "D" }).state?.graph).toBe(dag);
  });

  test("the traversal cue follows the direction actually walked", () => {
    const link = graph(false, false, ["A", "B"], [["A", "B"]]);
    let state = runBFS(createGraphRuntimeState(link), { startNode: "B" }).state!;
    while (state.execution.algorithmStep?.type !== "traverse_edge") {
      state = stepGraphExecution(state, { auto: true }).state!;
    }
    expect(state.execution.algorithmStep?.fromNodeId).toBe("B");
    expect(state.execution.algorithmStep?.toNodeId).toBe("A");
    const html = renderToStaticMarkup(
      <GraphRenderer graph={state.graph} viewState={state.view} execution={state.execution} onSelect={() => {}} />,
    );
    expect(html.includes('d="M 239 200 Q 212.5 200 186 200"')).toBe(true);
    expect(html.includes("canvas-graph-edge-trace")).toBe(true);
  });

  test("each link travels once and a distance update does not redraw it", () => {
    const link = graph(false, true, ["A", "B"], [["A", "B", 2]]);
    const traversals = [
      buildBfs(link, { startNode: "A" }),
      buildDfs(link, { startNode: "A" }),
      buildFindPath(link, { source: "A", target: "B" }),
      buildDijkstra(link, { source: "A", target: "B" }),
    ];
    for (const outcome of traversals) {
      expect(outcome.steps.filter((step) => step.type === "traverse_edge" && step.currentEdgeId === "e0")).toHaveLength(1);
    }
    let state = runDijkstra(createGraphRuntimeState(link), { source: "A", target: "B" }).state!;
    while (state.execution.algorithmStep?.type !== "traverse_edge") {
      state = stepGraphExecution(state, { auto: true }).state!;
    }
    const traveling = renderToStaticMarkup(
      <GraphRenderer graph={state.graph} viewState={state.view} execution={state.execution} onSelect={() => {}} />,
    );
    expect(traveling.includes("canvas-graph-edge-trace")).toBe(true);
    expect(traveling.includes("var(--graph-accent)")).toBe(true);
    state = stepGraphExecution(state, { auto: true }).state!;
    expect(state.execution.algorithmStep?.type).toBe("relax_edge");
    const settled = renderToStaticMarkup(
      <GraphRenderer graph={state.graph} viewState={state.view} execution={state.execution} onSelect={() => {}} />,
    );
    expect(settled.includes("canvas-graph-edge-trace")).toBe(false);
    expect(settled.includes("canvas-graph-edge-guide")).toBe(false);
  });

  test("the existing renderer exposes a trace for the current traversal", () => {
    let state = runBFS(createGraphRuntimeState(dag), { startNode: "A" }).state!;
    while (state.execution.algorithmStep?.type !== "traverse_edge") {
      state = stepGraphExecution(state, { auto: true }).state!;
    }
    const html = renderToStaticMarkup(
      <GraphRenderer graph={state.graph} viewState={state.view} execution={state.execution} onSelect={() => {}} />,
    );
    expect(html.includes("canvas-graph-edge-trace")).toBe(true);
  });
});
