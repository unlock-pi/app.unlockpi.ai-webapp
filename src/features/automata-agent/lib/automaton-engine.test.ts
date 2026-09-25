import { describe, expect, test } from "bun:test";

import {
  createAutomatonExecution,
  executeAutomaton,
  stepAutomaton,
  validateAutomaton,
  type Automaton,
} from "@/components/automata/model";
import {
  analyzeAutomaton,
  applyAutomatonOperations,
  createAutomatonDefinition,
  satisfyAutomatonGoal,
} from "@/features/automata-agent/lib/automaton-engine";
import { createAutomataTools } from "@/features/automata-agent/tools/automata";
import { createSchemaOnlyContext } from "@/features/automata-agent/tools/tool-context";

const ending01 = createAutomatonDefinition({
  automatonId: "dfa-ending-01",
  type: "dfa",
  alphabet: ["0", "1"],
  states: ["q0", "q1", "q2"],
  startState: "q0",
  acceptStates: ["q2"],
  transitions: [
    { from: "q0", to: "q1", symbols: ["0"] },
    { from: "q0", to: "q0", symbols: ["1"] },
    { from: "q1", to: "q1", symbols: ["0"] },
    { from: "q1", to: "q2", symbols: ["1"] },
    { from: "q2", to: "q1", symbols: ["0"] },
    { from: "q2", to: "q0", symbols: ["1"] },
  ],
});

describe("DFA execution", () => {
  test("returns a complete accepted trace", () => {
    const execution = executeAutomaton(ending01, "10101");
    expect(execution.result).toBe("accepted");
    expect(execution.currentStates).toEqual(["q2"]);
    expect(execution.steps).toHaveLength(5);
    expect(execution.visitedTransitions.length).toBeGreaterThan(0);
  });

  test("advances exactly one symbol and resets separately", () => {
    const initial = createAutomatonExecution(ending01, "101");
    const stepped = stepAutomaton(ending01, initial);
    expect(stepped.inputIndex).toBe(1);
    expect(stepped.stepIndex).toBe(1);
    expect(stepped.input).toBe("101");
    const reset = createAutomatonExecution(ending01, stepped.input);
    expect(reset.inputIndex).toBe(0);
    expect(reset.currentStates).toEqual(["q0"]);
    expect(reset.visitedTransitions).toEqual([]);
  });
});

describe("NFA execution", () => {
  test("takes initial epsilon closure and preserves branches", () => {
    const nfa = createAutomatonDefinition({
      automatonId: "nfa-branch",
      type: "nfa",
      alphabet: ["a"],
      states: ["q0", "q1", "q2", "q3"],
      startState: "q0",
      acceptStates: ["q3"],
      transitions: [
        { from: "q0", to: "q1", symbols: ["ε"] },
        { from: "q0", to: "q2", symbols: ["ε"] },
        { from: "q1", to: "q3", symbols: ["a"] },
        { from: "q2", to: "q2", symbols: ["a"] },
      ],
    });
    const initial = createAutomatonExecution(nfa, "a");
    expect(new Set(initial.currentStates)).toEqual(new Set(["q0", "q1", "q2"]));
    const execution = stepAutomaton(nfa, initial);
    expect(execution.result).toBe("accepted");
    expect(new Set(execution.currentStates)).toEqual(new Set(["q2", "q3"]));
    expect(execution.activeTransitions).toHaveLength(2);
  });
});

describe("transactional mutation and validation", () => {
  test("rejects a conflicting DFA batch without touching the source", () => {
    const before = structuredClone(ending01);
    const result = applyAutomatonOperations(ending01, [
      {
        type: "add_transition",
        transitionId: "conflict",
        from: "q0",
        to: "q2",
        symbols: ["1"],
      },
    ]);
    expect(result.success).toBe(false);
    expect(ending01).toEqual(before);
    if (!result.success) {
      expect(result.error.code).toBe("INVALID_AUTOMATON");
      expect(result.error.details?.state).toBe("q0");
    }
  });

  test("allows NFA nondeterminism and rejects DFA epsilon", () => {
    const nfa = { ...structuredClone(ending01), id: "nfa", type: "nfa" as const };
    expect(applyAutomatonOperations(nfa, [{
      type: "add_transition",
      from: "q0",
      to: "q2",
      symbols: ["1"],
    }]).success).toBe(true);
    const dfaWithEpsilon: Automaton = {
      ...structuredClone(ending01),
      transitions: [
        ...ending01.transitions,
        { id: "epsilon", from: "q0", to: "q2", symbols: ["ε"] },
      ],
    };
    expect(validateAutomaton(dfaWithEpsilon).issues.some(
      (issue) => issue.code === "DFA_EPSILON_TRANSITION",
    )).toBe(true);
  });
});

describe("goals and analyses", () => {
  test("makes target inputs accepted and verifies them", () => {
    const result = satisfyAutomatonGoal(ending01, {
      type: "accept",
      inputs: ["111", "101"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.verification.every((item) => item.result === "accepted")).toBe(true);
      expect(validateAutomaton(result.value.automaton).valid).toBe(true);
    }
  });

  test("makes an accepted input rejected", () => {
    const result = satisfyAutomatonGoal(ending01, {
      type: "reject",
      inputs: ["10101"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.verification[0].result).toBe("rejected");
    }
  });

  test("reports reachability, dead states, completeness and counts", () => {
    const withDead = createAutomatonDefinition({
      ...ending01,
      automatonId: "analysis",
      states: [...ending01.states, { id: "dead", label: "dead" }],
      transitions: ending01.transitions,
    });
    expect(analyzeAutomaton(withDead, "unreachable_states")).toEqual(["dead"]);
    expect(analyzeAutomaton(withDead, "state_count")).toBe(4);
    expect(analyzeAutomaton(ending01, "completeness")).toEqual({
      complete: true,
      missing: [],
    });
  });
});

test("the AI-facing surface contains exactly the required ten tools", () => {
  const names = Object.keys(createAutomataTools(createSchemaOnlyContext())).sort();
  expect(names).toEqual([
    "analyze_automaton",
    "create_automaton",
    "inspect_automaton",
    "modify_automaton",
    "reset_execution",
    "satisfy_automaton_goal",
    "select_automaton",
    "simulate_automaton",
    "step_execution",
    "validate_automaton",
  ]);
});
