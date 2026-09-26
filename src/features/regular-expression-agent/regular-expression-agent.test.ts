import { describe, expect, test } from "bun:test";

import type { Automaton } from "@/components/automata/model";
import { getRegularExpressionRealtimeTools } from "@/features/regular-expression-agent/lib/agent-identity";
import { applyCanvasAction } from "@/features/canvas/lib/canvas-commands";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";
import { convertNfaToDfa } from "@/features/automata-agent/lib/subset-construction";
import {
  createInitialRegularExpressionAgentState,
  type RegularExpressionAgentState,
} from "@/features/regular-expression-agent/lib/agent-state";
import { createRegularExpressionTools } from "@/features/regular-expression-agent/tools/regular-expression";
import type { RegularExpressionToolContext } from "@/features/regular-expression-agent/tools/tool-context";

function harness() {
  let state = createInitialRegularExpressionAgentState("canvas-test");
  const ctx: RegularExpressionToolContext = {
    get state() {
      return state;
    },
    commit(next) {
      state = structuredClone(next);
    },
  };
  const tools = createRegularExpressionTools(ctx);

  const run = async (
    name: keyof typeof tools,
    input: Record<string, unknown> = {},
  ) => {
    const definition = tools[name] as unknown as {
      execute: (
        value: Record<string, unknown>,
        options: Record<string, never>,
      ) => Promise<unknown>;
    };
    return definition.execute(input, {}) as Promise<{
      success: boolean;
      ok: boolean;
      operation: string;
      data?: Record<string, unknown>;
      error?: { code: string; details?: Record<string, unknown> };
    }>;
  };

  return {
    ctx,
    get state(): RegularExpressionAgentState {
      return state;
    },
    run,
    tools,
  };
}

describe("regular-expression agent tool surface", () => {
  test("contains exactly the required eighteen intent-level tools", () => {
    expect(Object.keys(harness().tools)).toEqual([
      "create_regular_expression",
      "update_regular_expression",
      "validate_regular_expression",
      "inspect_regular_expression",
      "highlight_expression",
      "show_syntax_tree",
      "highlight_syntax_node",
      "construct_epsilon_nfa",
      "show_construction_step",
      "reset_construction",
      "explain_construction_step",
      "simulate_automaton",
      "step_execution",
      "reset_execution",
      "convert_nfa_to_dfa",
      "show_conversion_step",
      "reset_conversion",
      "explain_conversion_step",
    ]);
  });

  test("validates without mutation and returns structured parser errors", async () => {
    const h = harness();
    for (const expression of ["a", "ab", "a|b", "a*", "(a|b)*abb", "ε", "∅"]) {
      const result = await h.run("validate_regular_expression", { expression });
      expect(result.success).toBe(true);
      expect(result.data?.valid).toBe(true);
    }

    const invalid = await h.run("validate_regular_expression", {
      expression: "(a|",
    });
    expect(invalid.success).toBe(true);
    expect(invalid.data?.valid).toBe(false);
    expect((invalid.data?.errors as unknown[]).length).toBeGreaterThan(0);
    expect(h.state.expression).toEqual(null);
  });

  test("creates, inspects, updates, and invalidates derived state", async () => {
    const h = harness();
    const created = await h.run("create_regular_expression", {
      expression: "(a|b)*abb",
    });
    expect(created.success).toBe(true);
    expect(created.data?.alphabet).toEqual(["a", "b"]);
    expect(created.data?.nodeCount).toBeGreaterThan(1);

    const inspected = await h.run("inspect_regular_expression");
    expect(inspected.data?.expression).toBe("(a|b)*abb");

    await h.run("construct_epsilon_nfa");
    await h.run("convert_nfa_to_dfa");
    const oldIds = [...h.state.automata.automatonOrder];
    expect(oldIds).toHaveLength(2);

    const updated = await h.run("update_regular_expression", {
      expression: "a*b",
    });
    expect(updated.success).toBe(true);
    expect(h.state.expressionVersion).toBe(2);
    expect(h.state.construction).toEqual(null);
    expect(h.state.conversion).toEqual(null);
    expect(h.state.automata.automatonOrder).toEqual([]);
    expect(h.state.view.generatedAutomaton).toEqual(null);
  });

  test("rejects invalid mutation without replacing current truth", async () => {
    const h = harness();
    await h.run("create_regular_expression", { expression: "ab" });
    const version = h.state.expressionVersion;
    const result = await h.run("update_regular_expression", {
      expression: "a||b",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("INVALID_REGULAR_EXPRESSION");
    expect(h.state.expression?.source).toBe("ab");
    expect(h.state.expressionVersion).toBe(version);
  });

  test("shows and highlights expression and syntax-tree nodes by stable ID", async () => {
    const h = harness();
    await h.run("create_regular_expression", { expression: "(a|b)*abb" });
    const union = h.state.expression
      ? h.state.expression.root &&
        JSON.parse(JSON.stringify(h.state.expression.root))
      : null;
    const unionNode = (() => {
      const pending = union ? [union] : [];
      while (pending.length) {
        const node = pending.shift() as Record<string, unknown>;
        if (node.type === "union") return node;
        for (const key of ["left", "right", "expression"]) {
          const child = node[key];
          if (child && typeof child === "object") pending.push(child as never);
        }
      }
      return null;
    })();
    const nodeId = unionNode?.id as string;

    expect((await h.run("show_syntax_tree")).success).toBe(true);
    expect(h.state.view.displayMode).toBe("tree");
    expect((await h.run("highlight_expression", { nodeId })).success).toBe(
      true,
    );
    expect(h.state.view.highlightedExpressionNodeIds).toEqual([nodeId]);

    const highlighted = await h.run("highlight_syntax_node", {
      nodeId,
      includeSubtree: true,
    });
    expect(highlighted.success).toBe(true);
    expect(highlighted.data?.nodeType).toBe("union");
    expect(h.state.view.highlightedSyntaxTreeSubtreeIds).toEqual([nodeId]);

    const missing = await h.run("highlight_syntax_node", {
      nodeId: "missing",
    });
    expect(missing.success).toBe(false);
    expect(missing.error?.code).toBe("AST_NODE_NOT_FOUND");
  });

  test("constructs and controls Thompson playback without deleting the NFA", async () => {
    const h = harness();
    for (const expression of ["a", "ab", "a|b", "a*", "(a|b)*abb"]) {
      await h.run("create_regular_expression", { expression });
      const result = await h.run("construct_epsilon_nfa");
      expect(result.success).toBe(true);
      expect(result.data?.type).toBe("epsilon-nfa");
      expect(Boolean(h.state.construction)).toBe(true);
    }

    const step = await h.run("show_construction_step", { step: 3 });
    expect(step.success).toBe(true);
    expect(h.state.view.currentConstructionStep).toBe(2);
    const automatonId = h.state.construction?.automaton.id;

    const explanation = await h.run("explain_construction_step");
    expect(explanation.success).toBe(true);
    expect(Boolean(explanation.data?.operation)).toBe(true);

    const reset = await h.run("reset_construction");
    expect(reset.success).toBe(true);
    expect(h.state.view.currentConstructionStep).toBe(0);
    expect(Boolean(h.state.automata.automata[automatonId as string])).toBe(
      true,
    );
  });

  test("simulates, steps, and resets through the shared automata execution model", async () => {
    const h = harness();
    await h.run("create_regular_expression", {
      expression: "(a|b)*abb",
    });
    await h.run("construct_epsilon_nfa");

    for (const input of ["abb", "aabb", "babb"]) {
      const result = await h.run("simulate_automaton", { input });
      expect(result.success).toBe(true);
      expect(result.data?.accepted).toBe(true);
    }
    for (const input of ["", "a", "ab"]) {
      const result = await h.run("simulate_automaton", { input });
      expect(result.success).toBe(true);
      expect(result.data?.accepted).toBe(false);
    }

    const unknown = await h.run("simulate_automaton", { input: "abbc" });
    expect(unknown.success).toBe(false);
    expect(unknown.error?.code).toBe("EXECUTION_ERROR");

    await h.run("reset_execution", { input: "aabb" });
    expect(h.state.view.currentInputIndex).toBe(0);
    const stepped = await h.run("step_execution");
    expect(stepped.success).toBe(true);
    expect(h.state.view.currentInputIndex).toBe(1);
    await h.run("reset_execution");
    expect(h.state.view.currentInputIndex).toBe(0);
  });

  test("highlights grouped AST IDs on visible syntax-tree nodes", async () => {
    const h = harness();
    await h.run("create_regular_expression", { expression: "((a))" });
    const root = h.state.expression?.root;
    expect(root?.type).toBe("group");
    const highlighted = await h.run("highlight_syntax_node", {
      nodeId: root?.id,
    });
    expect(highlighted.success).toBe(true);
    const selected = h.state.view.selectedSyntaxTreeNodeId;
    expect(
      h.state.view.syntaxTree?.nodes.some((node) => node.id === selected),
    ).toBe(true);
    expect(h.state.view.highlightedSyntaxTreeSubtreeIds).toEqual([selected]);
  });

  test("keeps construction previews separate from input execution", async () => {
    const h = harness();
    await h.run("create_regular_expression", { expression: "(a|b)*abb" });
    await h.run("construct_epsilon_nfa");
    const nfaId = h.state.construction?.automaton.id as string;
    await h.run("reset_execution", { input: "aabb" });
    const initial = structuredClone(h.state.automata.executions[nfaId]);

    await h.run("show_construction_step", { step: 3 });
    expect(h.state.automata.executions[nfaId]).toEqual(initial);
    expect(h.state.view.generatedAutomatonExecution?.currentStates).toEqual(
      h.state.construction?.trace[2].highlightedStateIds,
    );
    expect(
      h.state.view.generatedAutomatonExecution?.steps[0]?.transitions,
    ).toEqual(h.state.construction?.trace[2].highlightedTransitionIds);
    const firstPreviewId =
      h.state.view.generatedAutomatonExecution?.executionId;
    await h.run("show_construction_step", { step: 3 });
    expect(
      h.state.view.generatedAutomatonExecution?.executionId === firstPreviewId,
    ).toBe(false);

    await h.run("step_execution");
    expect(h.state.automata.executions[nfaId].inputIndex).toBe(1);
    expect(h.state.view.displayMode).toBe("expression");
    const stepped = structuredClone(h.state.automata.executions[nfaId]);
    await h.run("show_construction_step", { step: 2 });
    await h.run("reset_construction");
    expect(h.state.automata.executions[nfaId]).toEqual(stepped);
    expect(h.state.view.generatedAutomatonExecution).toEqual(stepped);

    await h.run("convert_nfa_to_dfa");
    const dfaId = h.state.conversion?.automaton.id as string;
    await h.run("reset_execution", { input: "aabb" });
    const dfaExecution = structuredClone(h.state.automata.executions[dfaId]);
    await h.run("show_conversion_step", { step: 2 });
    expect(h.state.automata.executions[dfaId]).toEqual(dfaExecution);
    expect(
      h.state.view.generatedAutomatonExecution?.steps[0]?.transitions,
    ).toEqual([h.state.conversion?.trace[1].createdTransitionId]);
    expect(h.state.view.displayMode).toBe("expression");
    await h.run("reset_conversion");
    expect(h.state.view.generatedAutomatonExecution).toEqual(dfaExecution);
    expect(h.state.view.conversionStepCount).toBe(0);
    expect(h.state.view.highlightedTargetStateIds).toEqual([]);
  });

  test("preserves authored automata on generated ID collisions and rebuilds", async () => {
    const h = harness();
    await h.run("create_regular_expression", { expression: "ab" });
    const authored: Automaton = {
      id: "re-v1-epsilon-nfa",
      type: "nfa",
      alphabet: ["a"],
      states: [{ id: "q0", label: "q0", initial: true, accepting: true }],
      transitions: [],
      startState: "q0",
      acceptStates: ["q0"],
    };
    h.state.automata.automata[authored.id] = authored;
    h.state.automata.automatonOrder.push(authored.id);

    await h.run("construct_epsilon_nfa");
    const generatedId = h.state.construction?.automaton.id as string;
    expect(generatedId).toBe("re-v1-epsilon-nfa-1");
    expect(h.state.automata.automata[authored.id]).toEqual(authored);
    await h.run("convert_nfa_to_dfa");
    const oldDfaId = h.state.conversion?.automaton.id as string;
    expect(Boolean(h.state.automata.automata[oldDfaId])).toBe(true);

    await h.run("construct_epsilon_nfa");
    expect(h.state.automata.automata[authored.id]).toEqual(authored);
    expect(Boolean(h.state.automata.automata[oldDfaId])).toBe(false);
    expect(Boolean(h.state.automata.executions[oldDfaId])).toBe(false);
    expect(h.state.conversion).toEqual(null);
    expect(h.state.construction?.automaton.id).toBe(generatedId);
  });

  test("creates only a visible DFA when conversion is requested directly from an expression", async () => {
    const h = harness();
    await h.run("create_regular_expression", { expression: "(a|b)*abb" });
    const converted = await h.run("convert_nfa_to_dfa");
    expect(converted.success).toBe(true);
    expect(h.state.construction?.automaton.type).toBe("nfa");
    expect(h.state.conversion?.automaton.type).toBe("dfa");
    expect(h.state.view.generatedAutomaton?.type).toBe("dfa");
    expect(h.state.view.generatedDfa?.type).toBe("dfa");
    expect(h.state.view.sourceAutomaton?.type).toBe("nfa");
    expect(h.state.automata.selectedAutomatonId).toBe(h.state.conversion?.automaton.id);
    const stepped = await h.run("show_conversion_step", { step: 1 });
    expect(stepped.success).toBe(true);
    expect(h.state.view.generatedAutomaton?.type).toBe("dfa");
  });

  test("converts to a separate DFA and controls conversion playback", async () => {
    const h = harness();
    await h.run("create_regular_expression", {
      expression: "(a|b)*abb",
    });
    await h.run("construct_epsilon_nfa");
    const source = structuredClone(h.state.construction?.automaton);

    const converted = await h.run("convert_nfa_to_dfa");
    expect(converted.success).toBe(true);
    expect(h.state.automata.automatonOrder).toHaveLength(2);
    expect(h.state.conversion?.automaton.type).toBe("dfa");
    expect(h.state.construction?.automaton).toEqual(source);

    expect(h.state.view.conversionPlaybackActive).toBe(true);
    const shown = await h.run("show_conversion_step", { step: 1 });
    expect(shown.success).toBe(true);
    expect(Boolean(shown.data?.epsilonClosure)).toBe(true);
    expect(h.state.view.sourceAutomatonExecution?.automatonId).toBe(source?.id);
    expect(h.state.view.sourceAutomatonExecution?.steps[0]?.transitions).toEqual(
      h.state.conversion?.trace[0]?.traversedNfaTransitionIds,
    );

    const explained = await h.run("explain_conversion_step");
    expect(explained.success).toBe(true);
    expect(
      String(explained.data?.explanation).includes("epsilon closure"),
    ).toBe(true);

    const reset = await h.run("reset_conversion");
    expect(reset.success).toBe(true);
    expect(h.state.currentConversionStep).toBe(0);
    expect(h.state.view.sourceAutomatonExecution).toBe(null);
    expect(h.state.view.conversionPlaybackActive).toBe(true);
    expect(h.state.automata.automatonOrder).toHaveLength(2);

    const storedSourceExecution = structuredClone(
      h.state.automata.executions[source?.id as string],
    );
    const dfaRun = await h.run("simulate_automaton", { input: "aabb" });
    expect(dfaRun.success).toBe(true);
    expect(dfaRun.data?.accepted).toBe(true);
    expect(h.state.view.conversionPlaybackActive).toBe(false);
    expect(h.state.view.sourceAutomatonExecution?.result).toBe("accepted");
    expect(h.state.view.sourceAutomatonExecution?.inputIndex).toBe(4);
    expect(h.state.automata.executions[source?.id as string]).toEqual(
      storedSourceExecution,
    );

    await h.run("reset_execution", { input: "abb" });
    expect(h.state.view.sourceAutomatonExecution?.inputIndex).toBe(0);
    await h.run("step_execution");
    const sourceRunId = h.state.view.sourceAutomatonExecution?.executionId;
    expect(h.state.view.sourceAutomatonExecution?.inputIndex).toBe(1);
    expect(
      (h.state.view.sourceAutomatonExecution?.steps[0]?.transitions.length ?? 0) > 0,
    ).toBe(true);
    await h.run("step_execution");
    expect(h.state.view.sourceAutomatonExecution?.executionId).toBe(sourceRunId);
    expect(h.state.view.sourceAutomatonExecution?.inputIndex).toBe(2);

    await h.run("show_construction_step", { step: 1 });
    await h.run("reset_execution", { input: "abb" });
    await h.run("step_execution");
    expect(h.state.view.generatedDfaExecution?.inputIndex).toBe(1);
    expect(
      (h.state.view.generatedDfaExecution?.steps[0]?.transitions.length ?? 0) > 0,
    ).toBe(true);
    await h.run("simulate_automaton", { input: "aabb" });
    expect(h.state.view.generatedDfaExecution?.result).toBe("accepted");
  });
});

describe("regular-expression integration contracts", () => {
  test("publishes exactly eighteen normalized Realtime function schemas", () => {
    const tools = getRegularExpressionRealtimeTools();
    expect(tools).toHaveLength(18);
    expect(tools.every((definition) => definition.type === "function")).toBe(
      true,
    );
    expect(
      tools.every(
        (definition) =>
          definition.parameters.additionalProperties === false &&
          !("$schema" in definition.parameters),
      ),
    ).toBe(true);
  });

  test("adds and updates an authored RE block through canvas actions", () => {
    const document = {
      root: {
        props: {
          title: "RE lesson",
          subject: "computer_science",
          theme: "default",
          typographyScale: "base",
          fontFamily: "modern",
        },
      },
      content: [
        {
          type: "SlideBlock",
          props: {
            id: "frame-1",
            title: "Regular expressions",
            teachingBeat: "explain",
            content: [],
          },
        },
      ],
    } as unknown as CanvasDocument;
    const regularExpression = {
      expression: "(a|b)*abb",
      input: "aabb",
      displayMode: "expression" as const,
      expressionSegments: [],
      syntaxTree: null,
      constructionSteps: [],
      showSyntaxTree: true,
      showConstruction: true,
      showInput: true,
      showExecutionControls: true,
    };

    const added = applyCanvasAction(document, "frame-1", {
      action: "add_regular_expression_block",
      regularExpression,
    });
    const slide = added.document.content[0];
    const block =
      slide.type === "SlideBlock"
        ? (
            slide.props.content as unknown as Array<{
              type: string;
              props: { id: string; expression?: string };
            }>
          )[0]
        : undefined;
    expect(block?.type).toBe("RegularExpressionBlock");
    expect(block?.props.expression).toBe("(a|b)*abb");

    const updated = applyCanvasAction(added.document, "frame-1", {
      action: "set_regular_expression_block",
      componentId: block?.props.id as string,
      regularExpression: {
        ...regularExpression,
        expression: "a*b",
      },
    });
    const updatedSlide = updated.document.content[0];
    const updatedBlock =
      updatedSlide.type === "SlideBlock"
        ? (
            updatedSlide.props.content as unknown as Array<{
              props: { expression?: string };
            }>
          )[0]
        : undefined;
    expect(updatedBlock?.props.expression).toBe("a*b");
  });
});

describe("shared subset construction", () => {
  test("handles branching, epsilon closure, accepting subsets, and a dead subset", () => {
    const source: Automaton = {
      id: "branching-nfa",
      type: "nfa",
      alphabet: ["a", "b"],
      states: [
        { id: "q0", label: "q0" },
        { id: "q1", label: "q1" },
        { id: "q2", label: "q2" },
        { id: "unreachable", label: "unreachable" },
      ],
      transitions: [
        { id: "e0", from: "q0", to: "q1", symbols: ["ε"] },
        { id: "a0", from: "q0", to: "q0", symbols: ["a"] },
        { id: "a1", from: "q1", to: "q2", symbols: ["a"] },
        { id: "b0", from: "q2", to: "q2", symbols: ["b"] },
      ],
      startState: "q0",
      acceptStates: ["q2"],
    };
    const before = structuredClone(source);
    const result = convertNfaToDfa(source);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(source).toEqual(before);
    expect(result.value.automaton.type).toBe("dfa");
    expect(result.value.stateSets.d0).toEqual(["q0", "q1"]);
    expect(result.value.automaton.states.some((state) => state.accepting)).toBe(
      true,
    );
    expect(
      Object.values(result.value.stateSets).some(
        (states) => states.length === 0,
      ),
    ).toBe(true);
    expect(
      Object.values(result.value.stateSets).flat().includes("unreachable"),
    ).toBe(false);
    expect(result.value.trace.length).toBe(
      result.value.automaton.states.length * source.alphabet.length,
    );
  });

  test("rejects DFA input without mutating it", () => {
    const dfa: Automaton = {
      id: "dfa",
      type: "dfa",
      alphabet: ["a"],
      states: [{ id: "q0", label: "q0" }],
      transitions: [{ id: "t0", from: "q0", to: "q0", symbols: ["a"] }],
      startState: "q0",
      acceptStates: ["q0"],
    };
    const result = convertNfaToDfa(dfa);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe("NOT_NFA");
  });
});
