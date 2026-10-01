import { describe, expect, test } from "bun:test";
import type { ContextFreeGrammar } from "@/components/context-free-grammar/types";
import { getContextFreeGrammarRealtimeTools } from "@/features/context-free-grammar-agent/agent-identity-agent";
import { readGrammarsFromCanvas } from "@/features/context-free-grammar-agent/hooks/use-context-free-grammar-canvas-bridge-agent";
import { applyCanvasAction } from "@/features/canvas/lib/canvas-commands";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";
import { createInitialContextFreeGrammarAgentState, type ContextFreeGrammarAgentState } from "@/features/context-free-grammar-agent/agent-state-agent";
import { deriveString, validateGrammar } from "@/features/context-free-grammar/grammar-engine";
import { createContextFreeGrammarTools } from "@/features/context-free-grammar-agent/tools-agent";
import type { GrammarToolContext } from "@/features/context-free-grammar-agent/tool-context-agent";

const grammar: ContextFreeGrammar = {
  variables: ["S"], terminals: ["a", "b"], startSymbol: "S",
  productions: [{ id: "p0", lhs: "S", rhs: ["a", "S", "b"] }, { id: "p1", lhs: "S", rhs: [] }],
};
function harness() {
  let state = createInitialContextFreeGrammarAgentState("canvas-test");
  const ctx: GrammarToolContext = {
    get state() { return state; },
    commit(next) { state = structuredClone(next); return null; },
  };
  const tools = createContextFreeGrammarTools(ctx);
  const run = async (name: keyof typeof tools, input: Record<string, unknown> = {}) => {
    const definition = tools[name] as unknown as { execute: (input: Record<string, unknown>, options: Record<string, never>) => Promise<unknown> };
    return definition.execute(input, {}) as Promise<{ success: boolean; data?: Record<string, unknown>; error?: { code: string } }>;
  };
  return { get state(): ContextFreeGrammarAgentState { return state; }, run, tools };
}
const createInput = (grammarId = "cfg-one") => ({ grammarId, ...grammar });

describe("CFG engine and 13-tool surface", () => {
  test("registers exactly 13 strict Realtime schemas", () => {
    const schemas = getContextFreeGrammarRealtimeTools();
    expect(schemas).toHaveLength(13);
    expect(schemas.every((schema) => schema.parameters.additionalProperties === false)).toBe(true);
  });

  test("creates and targets two persisted CFG Puck blocks", () => {
    const document = {
      root: { props: { title: "CFG", subject: "computer_science", theme: "default", typographyScale: "base", fontFamily: "modern" } },
      content: [{ type: "SlideBlock", props: { id: "frame-1", title: "Grammars", teachingBeat: "explain", content: [] } }],
    } as unknown as CanvasDocument;
    const first = applyCanvasAction(document, "frame-1", { action: "add_context_free_grammar_block", contextFreeGrammar: { grammarId: "one", grammar, input: "" } });
    const withFrame = applyCanvasAction(first.document, first.activeSlideId, { action: "add_frame", title: "Second CFG" });
    const second = applyCanvasAction(withFrame.document, withFrame.activeSlideId, { action: "add_context_free_grammar_block", contextFreeGrammar: { grammarId: "two", grammar, input: "" } });
    const snapshots = readGrammarsFromCanvas(second.document);
    expect(snapshots.map((snapshot) => snapshot.grammarId)).toEqual(["one", "two"]);
    const updated = applyCanvasAction(second.document, second.activeSlideId, { action: "set_context_free_grammar_block", componentId: snapshots[0].blockId, contextFreeGrammar: { grammarId: "one", grammar, input: "ab" } });
    const after = readGrammarsFromCanvas(updated.document);
    expect(after.find((snapshot) => snapshot.grammarId === "one")?.props.input).toBe("ab");
    expect(after.find((snapshot) => snapshot.grammarId === "two")?.props.input).toBe("");
  });

  test("validates symbols and rejects invalid grammar mutations", async () => {
    expect(validateGrammar(grammar).valid).toBe(true);
    expect(validateGrammar({ ...grammar, productions: [{ id: "bad", lhs: "S", rhs: ["X"] }] }).valid).toBe(false);
    const h = harness();
    await h.run("create_grammar", createInput());
    const bad = await h.run("modify_grammar", { change: { operation: "update_production", productionId: "p0", rhs: ["X"] } });
    expect(bad.success).toBe(false);
    expect(h.state.grammars["cfg-one"].grammar.productions[0].rhs).toEqual(["a", "S", "b"]);
  });

  test("derives aaabbb, builds a linked tree, and steps then resets", async () => {
    const h = harness();
    expect(Object.keys(h.tools)).toEqual([
      "create_grammar", "inspect_grammar", "modify_grammar", "validate_grammar",
      "set_input", "derive_string", "generate_parse_tree", "step_derivation",
      "reset_derivation", "show_derivation_step", "inspect_derivation",
      "highlight_production", "highlight_parse_tree_node",
    ]);
    expect((await h.run("create_grammar", createInput())).success).toBe(true);
    expect((await h.run("set_input", { input: "aaabbb" })).success).toBe(true);
    const derived = await h.run("derive_string");
    expect(derived.success).toBe(true);
    const steps = h.state.grammars["cfg-one"].derivation?.steps ?? [];
    expect(steps.map((step) => step.symbols.join(""))).toEqual(["S", "aSb", "aaSbb", "aaaSbbb", "aaabbb"]);
    expect(steps.at(-1)?.appliedProductionId).toBe("p1");
    expect(steps.at(-1)?.stepNumber).toBe(4);
    expect(h.state.grammars["cfg-one"].view.parseTree).toEqual(h.state.grammars["cfg-one"].derivation?.parseTree);
    const tree = await h.run("generate_parse_tree");
    expect(tree.success).toBe(true);
    expect((tree.data?.edges as unknown[]).length).toBeGreaterThan(0);
    expect(tree.data?.root).toBe("n0");
    const nodes = h.state.grammars["cfg-one"].derivation?.parseTree.nodes ?? [];
    expect(nodes.filter((node) => node.label === "S")).toHaveLength(4);
    expect(nodes.some((node) => node.label === "ε")).toBe(true);
    expect((await h.run("step_derivation")).success).toBe(true);
    expect(h.state.grammars["cfg-one"].currentStep).toBe(1);
    expect(h.state.grammars["cfg-one"].grammar).toEqual(grammar);
    expect((await h.run("show_derivation_step", { step: 4 })).success).toBe(true);
    expect(h.state.grammars["cfg-one"].view.result).toBe("accepted");
    expect((await h.run("reset_derivation")).success).toBe(true);
    expect(h.state.grammars["cfg-one"].currentStep).toBe(0);
    expect(h.state.grammars["cfg-one"].view.highlightedProductionIds).toEqual([]);
  });

  test("rejects aab without publishing a derivation", async () => {
    const h = harness();
    await h.run("create_grammar", createInput());
    await h.run("set_input", { input: "aab" });
    const result = await h.run("derive_string");
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("STRING_NOT_DERIVABLE");
    expect(h.state.grammars["cfg-one"].derivation).toBe(null);
  });

  test("invalidates computed state when a production changes", async () => {
    const h = harness();
    await h.run("create_grammar", createInput());
    await h.run("set_input", { input: "ab" });
    await h.run("derive_string");
    const changed = await h.run("modify_grammar", { change: { operation: "update_production", productionId: "p0", rhs: ["a", "b"] } });
    expect(changed.success).toBe(true);
    expect(h.state.grammars["cfg-one"].derivation).toBe(null);
    expect(h.state.grammars["cfg-one"].view.parseTree).toBe(null);
    expect(h.state.grammars["cfg-one"].grammar.productions[0].rhs).toEqual(["a", "b"]);
  });

  test("targets the named CFG rather than an arbitrary selected block", async () => {
    const h = harness();
    await h.run("create_grammar", createInput("cfg-one"));
    await h.run("create_grammar", createInput("cfg-two"));
    const result = await h.run("set_input", { grammarId: "cfg-one", input: "ab" });
    expect(result.success).toBe(true);
    expect(h.state.grammars["cfg-one"].input).toBe("ab");
    expect(h.state.grammars["cfg-two"].input).toBe("");
    const inspected = await h.run("inspect_grammar", { grammarId: "cfg-two" });
    expect(inspected.data?.grammarId).toBe("cfg-two");
  });

  test("reports unknown input, invalid cursor, and invalid highlight IDs without mutation", async () => {
    const h = harness();
    await h.run("create_grammar", createInput());
    const unknown = await h.run("set_input", { input: "aac" });
    expect(unknown.success).toBe(false);
    expect(unknown.error?.code).toBe("INVALID_INPUT");
    expect(h.state.grammars["cfg-one"].input).toBe("");
    await h.run("set_input", { input: "ab" });
    await h.run("derive_string");
    const cursor = await h.run("show_derivation_step", { step: 99 });
    expect(cursor.error?.code).toBe("STEP_OUT_OF_RANGE");
    expect(h.state.grammars["cfg-one"].currentStep).toBe(0);
    const production = await h.run("highlight_production", { productionId: "missing" });
    expect(production.error?.code).toBe("PRODUCTION_NOT_FOUND");
    const treeNode = await h.run("highlight_parse_tree_node", { nodeId: "missing" });
    expect(treeNode.error?.code).toBe("TREE_NODE_NOT_FOUND");
  });

  test("fixed-point derivation handles left recursion and epsilon cycles", () => {
    const recursive: ContextFreeGrammar = {
      variables: ["S"], terminals: ["a"], startSymbol: "S",
      productions: [{ id: "p0", lhs: "S", rhs: ["S", "a"] }, { id: "p1", lhs: "S", rhs: [] }],
    };
    const result = deriveString(recursive, "aaa");
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.steps.at(-1)?.symbols.join("")).toBe("aaa");
  });
});
