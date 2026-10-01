import { describe, expect, test } from "bun:test";
import { createAutomatonDefinition } from "@/features/automata-agent/lib/automaton-engine-agent";
import { buildDiagram } from "./transition-diagram";

describe("automata diagram edge routing", () => {
  test("keeps a forward edge straight and curves its return edge away", () => {
    const automaton = createAutomatonDefinition({
      automatonId: "reciprocal", type: "dfa", alphabet: ["0", "1"],
      states: ["q0", "q1"], startState: "q0",
      transitions: [
        { id: "forward", from: "q0", to: "q1", symbols: ["0"] },
        { id: "back", from: "q1", to: "q0", symbols: ["1"] },
      ],
    });
    const diagram = buildDiagram(automaton);
    const forward = diagram.edges.find((edge) => edge.transitionIds.includes("forward"));
    const back = diagram.edges.find((edge) => edge.transitionIds.includes("back"));
    expect(forward?.path.includes(" L ")).toBe(true);
    expect(back?.path.includes(" Q ")).toBe(true);
    expect(back!.labelAt.y).toBeGreaterThan(forward!.labelAt.y);
  });

  test("routes a long backward edge below the intermediate state", () => {
    const automaton = createAutomatonDefinition({
      automatonId: "long-return", type: "dfa", alphabet: ["0", "1"],
      states: ["q0", "q1", "q2"], startState: "q0",
      transitions: [
        { id: "first", from: "q0", to: "q1", symbols: ["0"] },
        { id: "second", from: "q1", to: "q2", symbols: ["0"] },
        { id: "return", from: "q2", to: "q0", symbols: ["1"] },
      ],
    });
    const diagram = buildDiagram(automaton);
    const middle = diagram.states.find((state) => state.id === "q1")!;
    const returning = diagram.edges.find((edge) => edge.transitionIds.includes("return"))!;
    expect(returning.path.includes(" Q ")).toBe(true);
    expect(returning.labelAt.y).toBeGreaterThan(middle.y + middle.radius);
  });
});
