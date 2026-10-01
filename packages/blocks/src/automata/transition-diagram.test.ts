import { describe, expect, test } from "bun:test";
import type { Automaton } from "./model";
import { buildDiagram } from "./transition-diagram";

function diagramAutomaton(
  id: string,
  stateIds: string[],
  transitions: Automaton["transitions"],
): Automaton {
  return {
    id,
    type: "dfa",
    alphabet: ["0", "1"],
    states: stateIds.map((stateId) => ({ id: stateId, label: stateId })),
    transitions,
    startState: stateIds[0],
    acceptStates: [],
  };
}

describe("automata diagram edge routing", () => {
  test("keeps a forward edge straight and curves its return edge away", () => {
    const automaton = diagramAutomaton("reciprocal", ["q0", "q1"], [
        { id: "forward", from: "q0", to: "q1", symbols: ["0"] },
        { id: "back", from: "q1", to: "q0", symbols: ["1"] },
    ]);
    const diagram = buildDiagram(automaton);
    const forward = diagram.edges.find((edge) => edge.transitionIds.includes("forward"));
    const back = diagram.edges.find((edge) => edge.transitionIds.includes("back"));
    expect(forward?.path.includes(" L ")).toBe(true);
    expect(back?.path.includes(" Q ")).toBe(true);
    expect(back!.labelAt.y).toBeGreaterThan(forward!.labelAt.y);
  });

  test("routes a long backward edge below the intermediate state", () => {
    const automaton = diagramAutomaton("long-return", ["q0", "q1", "q2"], [
        { id: "first", from: "q0", to: "q1", symbols: ["0"] },
        { id: "second", from: "q1", to: "q2", symbols: ["0"] },
        { id: "return", from: "q2", to: "q0", symbols: ["1"] },
    ]);
    const diagram = buildDiagram(automaton);
    const middle = diagram.states.find((state) => state.id === "q1")!;
    const returning = diagram.edges.find((edge) => edge.transitionIds.includes("return"))!;
    expect(returning.path.includes(" Q ")).toBe(true);
    expect(returning.labelAt.y).toBeGreaterThan(middle.y + middle.radius);
  });
});
