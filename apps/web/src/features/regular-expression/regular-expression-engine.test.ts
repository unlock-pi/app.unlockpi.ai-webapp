import { describe, expect, test } from "bun:test";

import {
  astToSyntaxTree,
  evaluationToRegularExpressionViewState,
} from "@/components/regular-expression/engine-adapters";

import {
  epsilonClosure,
  move,
  validateAutomaton,
  type Automaton,
} from "@/packages/blocks/automata/model";
import {
  createEpsilonNFAExecution,
  evaluateRegularExpressionSource,
  executeEpsilonNFA,
  resetEpsilonNFAExecution,
  stepEpsilonNFA,
} from "@/features/regular-expression/execution";
import type { RegularExpressionAst } from "@/features/regular-expression/model";
import { parseRegularExpression } from "@/features/regular-expression/parser";
import { constructEpsilonNFA } from "@/features/regular-expression/thompson";

function ast(source: string) {
  const parsed = parseRegularExpression(source);
  if (!parsed.ok) {
    throw new Error(parsed.errors.map((error) => error.message).join("; "));
  }
  return parsed.value.root;
}

function construction(source: string) {
  const result = constructEpsilonNFA(ast(source));
  if (!result.success) throw new Error(result.error.message);
  return result.value;
}

function evaluation(source: string, input: string) {
  const result = evaluateRegularExpressionSource(source, input);
  if (!result.success) throw new Error(result.error.message);
  return result.value;
}

describe("syntax-tree presentation adapter", () => {
  test("uses standard operator labels and omits grouping-only nodes", () => {
    const tree = astToSyntaxTree(ast("(a|b)*abb"));

    expect(tree.nodes.some((node) => node.kind === "group")).toBe(false);
    expect(
      tree.nodes
        .filter((node) => node.kind === "concatenation")
        .every((node) => node.label === "·"),
    ).toBe(true);
    expect(tree.nodes.find((node) => node.kind === "union")?.label).toBe("|");
    expect(tree.nodes.find((node) => node.kind === "kleene-star")?.label).toBe(
      "*",
    );
    expect(tree.nodes.some((node) => node.id === tree.rootId)).toBe(true);
  });
});

describe("Thompson construction", () => {
  test("constructs literal, epsilon, and empty-set fragments", () => {
    const literal = construction("a");
    expect(literal.automaton.startState).toBe("q0");
    expect(literal.automaton.acceptStates).toEqual(["q1"]);
    expect(literal.automaton.states).toHaveLength(2);
    expect(literal.automaton.transitions).toEqual([
      { id: "t0", from: "q0", to: "q1", symbols: ["a"] },
    ]);

    const epsilon = construction("ε");
    expect(epsilon.automaton.transitions[0]?.symbols).toEqual(["ε"]);
    expect(evaluation("ε", "").accepted).toBe(true);

    const emptySet = construction("∅");
    expect(emptySet.automaton.states).toHaveLength(2);
    expect(emptySet.automaton.transitions).toHaveLength(0);
    expect(evaluation("∅", "").accepted).toBe(false);
    expect(evaluation("∅", "a").accepted).toBe(undefined);
    expect(evaluation("∅", "a").execution.error?.code).toBe("UNKNOWN_SYMBOL");
  });

  test("connects concatenation without wrapper states", () => {
    const result = construction("ab");
    expect(result.automaton.states).toHaveLength(4);
    expect(result.automaton.transitions).toHaveLength(3);
    expect(
      result.automaton.transitions.filter((transition) =>
        transition.symbols.includes("ε"),
      ),
    ).toHaveLength(1);
    expect(evaluation("ab", "ab").accepted).toBe(true);
    expect(evaluation("ab", "a").accepted).toBe(false);
  });

  test("constructs standard union and star wrappers", () => {
    const union = construction("a|b");
    expect(union.automaton.states).toHaveLength(6);
    expect(union.automaton.transitions).toHaveLength(6);
    expect(
      union.automaton.transitions.filter((transition) =>
        transition.symbols.includes("ε"),
      ),
    ).toHaveLength(4);

    const star = construction("a*");
    expect(star.automaton.states).toHaveLength(4);
    expect(star.automaton.transitions).toHaveLength(5);
    expect(evaluation("a*", "").accepted).toBe(true);
    expect(evaluation("a*", "aaa").accepted).toBe(true);
  });

  test("constructs nested expressions deterministically", () => {
    ["(a|b)*", "(a|b)*abb", "(ab|c)*", "a(b|c)", "((a|b)c)*"].forEach(
      (source) => {
        const first = construction(source);
        const second = construction(source);
        expect(first.automaton).toEqual(second.automaton);
        expect(validateAutomaton(first.automaton).valid).toBe(true);
      },
    );

    const main = construction("(a|b)*abb");
    expect(main.automaton.states).toHaveLength(14);
    expect(main.automaton.transitions).toHaveLength(16);
  });

  test("maps each AST node to its complete fragment and traces direct creations", () => {
    const root = ast("(a|b)");
    const result = constructEpsilonNFA(root);
    if (!result.success) throw new Error(result.error.message);

    expect(result.value.trace).toHaveLength(3);
    expect(result.value.trace[2]?.operation).toBe("union");
    expect(result.value.trace[2]?.createdStateIds).toHaveLength(2);
    expect(result.value.trace[2]?.createdTransitionIds).toHaveLength(4);
    expect(result.value.nodeMappings[root.id]?.stateIds).toHaveLength(6);
    expect(result.value.nodeMappings[root.id]?.transitionIds).toHaveLength(6);
  });

  test("rejects malformed ASTs before construction", () => {
    const invalid = {
      id: "literal:0:0",
      type: "literal",
      span: { start: 0, end: 0 },
      value: "",
    } as RegularExpressionAst;
    const result = constructEpsilonNFA(invalid);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("INVALID_AST");

    const malformed = constructEpsilonNFA({
      type: "union",
    } as RegularExpressionAst);
    expect(malformed.success).toBe(false);
    if (!malformed.success) expect(malformed.error.code).toBe("INVALID_AST");
  });
});

describe("shared epsilon-NFA primitives", () => {
  const cyclic: Automaton = {
    id: "epsilon-cycle",
    type: "nfa",
    alphabet: ["a"],
    states: ["q0", "q1", "q2", "q3"].map((id) => ({ id, label: id })),
    transitions: [
      { id: "t0", from: "q0", to: "q1", symbols: ["ε"] },
      { id: "t1", from: "q1", to: "q2", symbols: ["ε"] },
      { id: "t2", from: "q2", to: "q1", symbols: ["ε"] },
      { id: "t3", from: "q2", to: "q3", symbols: ["a"] },
    ],
    startState: "q0",
    acceptStates: ["q3"],
  };

  test("epsilon closure terminates through cycles and removes duplicates", () => {
    expect(new Set(epsilonClosure(cyclic, ["q0"]))).toEqual(
      new Set(["q0", "q1", "q2"]),
    );
    expect(epsilonClosure(cyclic, [])).toEqual([]);
  });

  test("move consumes only the requested symbol", () => {
    expect(
      move(cyclic, ["q0", "q1", "q2"], "a").map((edge) => edge.to),
    ).toEqual(["q3"]);
  });
});

describe("epsilon-NFA execution", () => {
  test("supports reset and exactly one-symbol stepping", () => {
    const automaton = construction("a*").automaton;
    const initial = createEpsilonNFAExecution(automaton, "aa");
    expect(initial.execution.inputIndex).toBe(0);
    expect(initial.execution.result).toBe("unknown");
    expect(initial.accepted).toBe(undefined);
    expect(initial.trace).toHaveLength(1);
    expect(initial.trace[0]?.traversedTransitionIds.length).toBeGreaterThan(0);

    const stepped = stepEpsilonNFA(automaton, initial);
    expect(stepped.execution.inputIndex).toBe(1);
    expect(stepped.trace).toHaveLength(2);
    expect(stepped.trace[1]?.consumedSymbol).toBe("a");

    const reset = resetEpsilonNFAExecution(automaton, stepped);
    expect(reset.execution.inputIndex).toBe(0);
    expect(reset.execution.currentStates).toEqual(
      initial.execution.currentStates,
    );
    expect(reset.execution.result).toBe("unknown");
    expect(reset.trace).toHaveLength(1);
  });

  test("evaluates the required languages", () => {
    const cases: Array<[string, string, boolean]> = [
      ["a", "a", true],
      ["a", "", false],
      ["a*", "", true],
      ["a*", "aaa", true],
      ["a|b", "a", true],
      ["a|b", "b", true],
      ["a|b", "ab", false],
      ["ab", "ab", true],
      ["ab", "abb", false],
      ["(a|b)*", "abba", true],
      ["(a|b)*abb", "abb", true],
      ["(a|b)*abb", "aabb", true],
      ["(a|b)*abb", "babb", true],
      ["(a|b)*abb", "abababb", true],
      ["(a|b)*abb", "ab", false],
      ["(a|b)*abb", "aab", false],
      ["(a|b)*abb", "bba", false],
    ];

    cases.forEach(([source, input, accepted]) => {
      expect(evaluation(source, input).accepted).toBe(accepted);
    });
  });

  test("returns a playback-ready trace including the initial closure", () => {
    const result = evaluation("(a|b)*abb", "aabb");
    expect(result.execution.trace).toHaveLength(5);
    expect(result.execution.trace[0]?.step).toBe(0);
    expect(result.execution.trace[0]?.consumedSymbol).toBe(null);
    expect(result.execution.trace[4]?.inputIndex).toBe(4);
    expect(result.execution.trace[4]?.remainingSymbols).toEqual([]);
    expect(result.execution.trace[4]?.activeStateIds.length).toBeGreaterThan(0);
    expect(result.execution.execution.result).toBe("accepted");

    const view = evaluationToRegularExpressionViewState(result, 2);
    expect(view.currentInputIndex).toBe(2);
    expect(view.generatedAutomaton?.type).toBe("nfa");
    expect(view.generatedAutomatonExecution?.currentStates).toEqual(
      result.execution.trace[2]?.activeStateIds,
    );
  });

  test("reports unknown symbols without silently consuming them", () => {
    const result = evaluation("ab", "ac");
    expect(result.accepted).toBe(undefined);
    expect(result.execution.execution.status).toBe("error");
    expect(result.execution.error?.code).toBe("UNKNOWN_SYMBOL");
    expect(result.execution.error?.symbol).toBe("c");
    expect(result.execution.execution.inputIndex).toBe(1);
    expect(result.execution.trace.at(-1)?.traversedTransitionIds).toEqual([]);
  });

  test("uses the shared tokenizer for multi-character automaton symbols", () => {
    const automaton: Automaton = {
      id: "multi-symbol",
      type: "nfa",
      alphabet: ["ab"],
      states: [
        { id: "q0", label: "q0", initial: true },
        { id: "q1", label: "q1", accepting: true },
      ],
      transitions: [{ id: "t0", from: "q0", to: "q1", symbols: ["ab"] }],
      startState: "q0",
      acceptStates: ["q1"],
    };
    const result = executeEpsilonNFA(automaton, "ab");
    expect(result.inputSymbols).toEqual(["ab"]);
    expect(result.accepted).toBe(true);
  });
});
