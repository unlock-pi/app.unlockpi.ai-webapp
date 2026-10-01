import { tool } from "ai";
import { z } from "zod";

import type { ContextFreeGrammar } from "@/features/context-free-grammar/model";
import {
  atDerivationStep, createGrammarRecord, replaceGrammar, replaceInput,
  withDerivation,
  type ContextFreeGrammarAgentState, type GrammarRecord,
} from "@/features/context-free-grammar-agent/agent-state-agent";
import {
  deriveString, modifyGrammar, resetDerivation, showDerivationStep,
  stepDerivation, tokenizeGrammarInput, validateGrammar,
  type GrammarMutation,
} from "@/features/context-free-grammar/grammar-engine";
import { fail, succeed, type GrammarToolContext, type GrammarToolOutcome, type GrammarCommitChange } from "@/features/context-free-grammar-agent/tool-context-agent";

const symbol = z.string().min(1);
const productionInput = z.object({ id: symbol.optional(), lhs: symbol, rhs: z.array(symbol) }).strict();
const target = { grammarId: symbol.optional() };
const mutationSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("add_production"), production: productionInput }).strict(),
  z.object({ operation: z.literal("update_production"), productionId: symbol, lhs: symbol.optional(), rhs: z.array(symbol).optional() }).strict(),
  z.object({ operation: z.literal("remove_production"), productionId: symbol }).strict(),
  z.object({ operation: z.literal("set_start_symbol"), symbol }).strict(),
  z.object({ operation: z.literal("add_variable"), symbol }).strict(),
  z.object({ operation: z.literal("remove_variable"), symbol }).strict(),
  z.object({ operation: z.literal("add_terminal"), symbol }).strict(),
  z.object({ operation: z.literal("remove_terminal"), symbol }).strict(),
]);

function resolve(ctx: GrammarToolContext, operation: string, grammarId?: string): { record: GrammarRecord } | { outcome: GrammarToolOutcome } {
  const id = grammarId ?? ctx.state.selectedGrammarId;
  const record = id ? ctx.state.grammars[id] : null;
  if (record) return { record };
  return { outcome: fail(ctx, operation, {
    code: "GRAMMAR_NOT_FOUND",
    message: grammarId ? "CFG " + grammarId + " does not exist." : "No CFG block is selected.",
    details: { available: ctx.state.grammarOrder },
  }) };
}

function nextState(state: ContextFreeGrammarAgentState, record: GrammarRecord): ContextFreeGrammarAgentState {
  const next = structuredClone(state);
  next.grammars[record.grammarId] = record;
  next.selectedGrammarId = record.grammarId;
  return next;
}
function propsFor(record: GrammarRecord) {
  return { grammarId: record.grammarId, grammar: record.grammar, input: record.input, derivationSteps: [], parseTree: null };
}
async function commit(ctx: GrammarToolContext, operation: string, next: ContextFreeGrammarAgentState, summary: string, data?: unknown, change?: GrammarCommitChange) {
  const error = await ctx.commit(next, change);
  return error ? fail(ctx, operation, error) : succeed(ctx, operation, summary, data);
}
function missingDerivation(ctx: GrammarToolContext, operation: string) {
  return fail(ctx, operation, { code: "DERIVATION_NOT_FOUND", message: "Derive the current input first." });
}
function stepData(record: GrammarRecord) {
  const steps = record.derivation?.steps ?? [];
  const current = steps[record.currentStep];
  const production = current?.appliedProductionId
    ? record.grammar.productions.find((item) => item.id === current.appliedProductionId)
    : null;
  return {
    grammarId: record.grammarId,
    currentStep: record.currentStep,
    totalSteps: steps.length,
    sententialForm: current?.symbols.join("") ?? record.grammar.startSymbol,
    appliedProduction: production ? production.lhs + " → " + (production.rhs.join("") || "ε") : null,
    appliedProductionId: production?.id ?? null,
    targetInput: record.input,
    status: !record.derivation ? "idle" : record.currentStep === steps.length - 1 ? "complete" : "ready",
  };
}

export function createContextFreeGrammarTools(ctx: GrammarToolContext) {
  return {
    create_grammar: tool({
      description: "Create a new CFG from declared variables, terminals, start symbol, and structured productions. The right-hand side is an array of symbols; use [] for ε. Creates a CFG block but does not derive an input.",
      inputSchema: z.object({
        grammarId: symbol.optional(),
        variables: z.array(symbol).min(1),
        terminals: z.array(symbol),
        startSymbol: symbol,
        productions: z.array(productionInput),
      }).strict(),
      execute: async (input) => {
        const grammarId = input.grammarId ?? "cfg-" + String(ctx.state.grammarOrder.length + 1).padStart(2, "0");
        if (ctx.state.grammars[grammarId]) return fail(ctx, "create_grammar", { code: "DUPLICATE_ID", message: "CFG " + grammarId + " already exists." });
        const grammar: ContextFreeGrammar = {
          variables: input.variables, terminals: input.terminals, startSymbol: input.startSymbol,
          productions: input.productions.map((production, index) => ({ ...production, id: production.id ?? "p" + index })),
        };
        const validation = validateGrammar(grammar);
        if (!validation.valid) return fail(ctx, "create_grammar", { code: "INVALID_GRAMMAR", message: validation.errors[0].message, details: { validation } });
        const record = createGrammarRecord(grammarId, grammar);
        const next = nextState(ctx.state, record);
        next.grammarOrder.push(grammarId);
        return commit(ctx, "create_grammar", next, "Created " + grammarId + ".", { grammarId, grammarVersion: 1 }, { kind: "create", grammarId, props: propsFor(record) });
      },
    }),
    inspect_grammar: tool({
      description: "Read the authoritative CFG definition and structural validation.",
      inputSchema: z.object(target).strict(),
      execute: async ({ grammarId }) => {
        const found = resolve(ctx, "inspect_grammar", grammarId);
        if (!("record" in found)) return found.outcome;
        return succeed(ctx, "inspect_grammar", "Inspected " + found.record.grammarId + ".", {
          grammarId: found.record.grammarId, grammarVersion: found.record.version,
          ...found.record.grammar, validation: validateGrammar(found.record.grammar),
        });
      },
    }),
    modify_grammar: tool({
      description: "Transactionally add, update, or remove one production or declared symbol, or set the start symbol. Invalid changes are rejected without mutation.",
      inputSchema: z.object({ grammarId: symbol.optional(), change: mutationSchema }).strict(),
      execute: async ({ grammarId, change }) => {
        const found = resolve(ctx, "modify_grammar", grammarId);
        if (!("record" in found)) return found.outcome;
        const record = found.record;
        const usedProductionIds = new Set(record.grammar.productions.map((item) => item.id));
        let nextProductionIndex = record.grammar.productions.length;
        while (usedProductionIds.has("p" + nextProductionIndex)) nextProductionIndex++;
        const normalized: GrammarMutation = change.operation === "add_production"
          ? { operation: "add_production", production: {
              ...change.production,
              id: change.production.id ?? "p" + nextProductionIndex,
            } }
          : change;
        const result = modifyGrammar(record.grammar, normalized);
        if (!result.success) return fail(ctx, "modify_grammar", result.error);
        const updated = replaceGrammar(record, result.value);
        return commit(ctx, "modify_grammar", nextState(ctx.state, updated), "Updated " + record.grammarId + ".", {
          grammarId: record.grammarId, grammarVersion: updated.version,
          productionId: normalized.operation === "add_production" ? normalized.production.id : "productionId" in normalized ? normalized.productionId : undefined,
          validation: validateGrammar(updated.grammar),
        }, { kind: "update", grammarId: record.grammarId, props: propsFor(updated) });
      },
    }),
    validate_grammar: tool({
      description: "Check structural CFG validity without changing the grammar.",
      inputSchema: z.object(target).strict(),
      execute: async ({ grammarId }) => {
        const found = resolve(ctx, "validate_grammar", grammarId);
        if (!("record" in found)) return found.outcome;
        return succeed(ctx, "validate_grammar", "Validated " + found.record.grammarId + ".", validateGrammar(found.record.grammar));
      },
    }),
    set_input: tool({
      description: "Set the current target input without deriving it. Changes invalidate any old derivation and parse tree.",
      inputSchema: z.object({ ...target, input: z.string() }).strict(),
      execute: async ({ grammarId, input }) => {
        const found = resolve(ctx, "set_input", grammarId);
        if (!("record" in found)) return found.outcome;
        const tokens = tokenizeGrammarInput(found.record.grammar, input);
        if (!tokens.success) return fail(ctx, "set_input", tokens.error);
        const updated = replaceInput(found.record, input);
        updated.view.inputSymbols = tokens.value;
        return commit(ctx, "set_input", nextState(ctx.state, updated), "Set input for " + updated.grammarId + ".", {
          grammarId: updated.grammarId, input, inputSymbols: tokens.value,
        }, { kind: "update", grammarId: updated.grammarId, props: propsFor(updated) });
      },
    }),
    derive_string: tool({
      description: "Find a leftmost derivation of the current input using the CFG engine and make its parse tree available for branch-by-branch playback.",
      inputSchema: z.object(target).strict(),
      execute: async ({ grammarId }) => {
        const found = resolve(ctx, "derive_string", grammarId);
        if (!("record" in found)) return found.outcome;
        const result = deriveString(found.record.grammar, found.record.input);
        if (!result.success) return fail(ctx, "derive_string", result.error);
        const updated = withDerivation(found.record, result.value);
        return commit(ctx, "derive_string", nextState(ctx.state, updated), "Derived " + updated.grammarId + " input.", {
          grammarId: updated.grammarId, targetInput: updated.input,
          steps: result.value.steps, totalSteps: result.value.steps.length,
        }, { kind: "select", grammarId: updated.grammarId });
      },
    }),
    generate_parse_tree: tool({
      description: "Reveal the structured parse tree associated with the current derivation; does not draw SVG or HTML.",
      inputSchema: z.object(target).strict(),
      execute: async ({ grammarId }) => {
        const found = resolve(ctx, "generate_parse_tree", grammarId);
        if (!("record" in found)) return found.outcome;
        if (!found.record.derivation) return missingDerivation(ctx, "generate_parse_tree");
        const updated = structuredClone(found.record);
        updated.treeVisible = true;
        updated.view.parseTree = updated.derivation!.parseTree;
        return commit(ctx, "generate_parse_tree", nextState(ctx.state, updated), "Generated parse tree.", {
          grammarId: updated.grammarId,
          root: updated.derivation!.parseTree.rootId,
          nodes: updated.derivation!.parseTree.nodes,
          edges: updated.derivation!.parseTree.nodes.flatMap((node) =>
            (node.children ?? []).map((childId) => ({ from: node.id, to: childId }))),
        }, { kind: "select", grammarId: updated.grammarId });
      },
    }),
    step_derivation: tool({
      description: "Advance the current derivation by exactly one step without changing the grammar.",
      inputSchema: z.object(target).strict(),
      execute: async ({ grammarId }) => {
        const found = resolve(ctx, "step_derivation", grammarId);
        if (!("record" in found)) return found.outcome;
        if (!found.record.derivation) return missingDerivation(ctx, "step_derivation");
        if (found.record.currentStep >= found.record.derivation.steps.length - 1)
          return fail(ctx, "step_derivation", { code: "STEP_OUT_OF_RANGE", message: "The derivation is already at its final step." });
        const result = stepDerivation(found.record.currentStep, found.record.derivation);
        if (!result.success) return fail(ctx, "step_derivation", result.error);
        const updated = atDerivationStep(found.record, result.value);
        return commit(ctx, "step_derivation", nextState(ctx.state, updated), "Advanced one derivation step.", stepData(updated), { kind: "select", grammarId: updated.grammarId });
      },
    }),
    reset_derivation: tool({
      description: "Reset playback to the initial sentential form; preserve grammar, input, derivation, and parse tree.",
      inputSchema: z.object(target).strict(),
      execute: async ({ grammarId }) => {
        const found = resolve(ctx, "reset_derivation", grammarId);
        if (!("record" in found)) return found.outcome;
        if (!found.record.derivation) return missingDerivation(ctx, "reset_derivation");
        const updated = atDerivationStep(found.record, resetDerivation());
        updated.view.activeParseTreeNodeId = null;
        updated.view.selectedParseTreeNodeId = null;
        updated.view.highlightedSubtreeRootIds = [];
        updated.view.highlightedParseTreeNodeIds = [];
        updated.view.highlightedParseTreeEdges = [];
        updated.view.highlightedProductionIds = [];
        updated.view.selectedProductionId = null;
        return commit(ctx, "reset_derivation", nextState(ctx.state, updated), "Reset derivation.", stepData(updated), { kind: "select", grammarId: updated.grammarId });
      },
    }),
    show_derivation_step: tool({
      description: "Show a specific zero-based derivation step without recalculating or changing the grammar.",
      inputSchema: z.object({ ...target, step: z.number().int().nonnegative() }).strict(),
      execute: async ({ grammarId, step }) => {
        const found = resolve(ctx, "show_derivation_step", grammarId);
        if (!("record" in found)) return found.outcome;
        if (!found.record.derivation) return missingDerivation(ctx, "show_derivation_step");
        const result = showDerivationStep(step, found.record.derivation);
        if (!result.success) return fail(ctx, "show_derivation_step", result.error);
        const updated = atDerivationStep(found.record, result.value);
        return commit(ctx, "show_derivation_step", nextState(ctx.state, updated), "Showing derivation step " + step + ".", stepData(updated), { kind: "select", grammarId: updated.grammarId });
      },
    }),
    inspect_derivation: tool({
      description: "Read the selected CFG derivation cursor and current sentential form.",
      inputSchema: z.object(target).strict(),
      execute: async ({ grammarId }) => {
        const found = resolve(ctx, "inspect_derivation", grammarId);
        if (!("record" in found)) return found.outcome;
        return succeed(ctx, "inspect_derivation", "Inspected derivation.", stepData(found.record));
      },
    }),
    highlight_production: tool({
      description: "Highlight an existing production in the CFG view only; does not change grammar data.",
      inputSchema: z.object({ ...target, productionId: symbol }).strict(),
      execute: async ({ grammarId, productionId }) => {
        const found = resolve(ctx, "highlight_production", grammarId);
        if (!("record" in found)) return found.outcome;
        if (!found.record.grammar.productions.some((production) => production.id === productionId))
          return fail(ctx, "highlight_production", { code: "PRODUCTION_NOT_FOUND", message: "Production " + productionId + " does not exist." });
        const updated = structuredClone(found.record);
        updated.view.selectedProductionId = productionId;
        updated.view.highlightedProductionIds = [productionId];
        return commit(ctx, "highlight_production", nextState(ctx.state, updated), "Highlighted " + productionId + ".", { grammarId: updated.grammarId, productionId }, { kind: "select", grammarId: updated.grammarId });
      },
    }),
    highlight_parse_tree_node: tool({
      description: "Highlight an existing parse-tree node or subtree in the CFG view only.",
      inputSchema: z.object({ ...target, nodeId: symbol, subtree: z.boolean().optional() }).strict(),
      execute: async ({ grammarId, nodeId, subtree = false }) => {
        const found = resolve(ctx, "highlight_parse_tree_node", grammarId);
        if (!("record" in found)) return found.outcome;
        if (!found.record.derivation) return missingDerivation(ctx, "highlight_parse_tree_node");
        if (!found.record.derivation.parseTree.nodes.some((node) => node.id === nodeId))
          return fail(ctx, "highlight_parse_tree_node", { code: "TREE_NODE_NOT_FOUND", message: "Parse-tree node " + nodeId + " does not exist." });
        const updated = structuredClone(found.record);
        updated.treeVisible = true;
        updated.view.parseTree = updated.derivation!.parseTree;
        updated.view.selectedParseTreeNodeId = nodeId;
        updated.view.highlightedParseTreeNodeIds = subtree ? [] : [nodeId];
        updated.view.highlightedSubtreeRootIds = subtree ? [nodeId] : [];
        return commit(ctx, "highlight_parse_tree_node", nextState(ctx.state, updated), "Highlighted tree node " + nodeId + ".", { grammarId: updated.grammarId, nodeId, subtree }, { kind: "select", grammarId: updated.grammarId });
      },
    }),
  };
}
