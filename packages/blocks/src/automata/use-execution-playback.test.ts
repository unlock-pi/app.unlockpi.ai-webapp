import { describe, expect, test } from "bun:test";

import { executeAutomaton, type Automaton } from "./model";
import {
  executionAtStep,
  executionBeforeStep,
} from "./use-execution-playback";

describe("shared automata water-flow playback", () => {
  test("keeps the source active while the arrow fills, then activates the destination", () => {
    const automaton: Automaton = {
      id: "dfa-flow",
      type: "dfa",
      alphabet: ["a"],
      states: [
        { id: "q0", label: "q0", initial: true },
        { id: "q1", label: "q1", accepting: true },
      ],
      transitions: [{ id: "t0", from: "q0", to: "q1", symbols: ["a"] }],
      startState: "q0",
      acceptStates: ["q1"],
    };
    const execution = executeAutomaton(automaton, "a");
    const traveling = executionBeforeStep(execution, 1);
    expect(traveling.transitionPhase).toBe("traveling");
    expect(traveling.currentStates).toEqual(["q0"]);
    expect(traveling.activeTransitions).toEqual(["t0"]);
    expect(traveling.inputIndex).toBe(0);
    expect(traveling.result).toBe("unknown");

    const arrived = executionAtStep(execution, 1);
    expect(arrived.transitionPhase).toEqual(undefined);
    expect(arrived.currentStates).toEqual(["q1"]);
    expect(arrived.inputIndex).toBe(1);
    expect(arrived.result).toBe("accepted");
  });

  test("uses the same travel and arrival phases for a generated epsilon NFA", () => {
    const automaton: Automaton = {
      id: "epsilon-nfa-flow",
      type: "nfa",
      alphabet: ["a"],
      states: ["q0", "q1", "q2", "q3"].map((id) => ({ id, label: id })),
      transitions: [
        { id: "epsilon-start", from: "q0", to: "q1", symbols: ["ε"] },
        { id: "literal", from: "q1", to: "q2", symbols: ["a"] },
        { id: "epsilon-end", from: "q2", to: "q3", symbols: ["ε"] },
      ],
      startState: "q0",
      acceptStates: ["q3"],
    };
    const execution = executeAutomaton(automaton, "a");
    const step = execution.steps[0];
    expect(step.transitions.length).toBeGreaterThan(0);
    expect(executionBeforeStep(execution, 1).currentStates).toEqual(
      step.fromStates,
    );
    expect(executionBeforeStep(execution, 1).activeTransitions).toEqual(
      step.transitions,
    );
    expect(executionAtStep(execution, 1).currentStates).toEqual(step.toStates);
  });
});
