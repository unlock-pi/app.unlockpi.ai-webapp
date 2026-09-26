import { tool } from "ai";
import { z } from "zod";

import {
  createAutomatonExecution,
  stepAutomaton,
  tokenizeAutomatonInput,
  type Automaton,
  type AutomatonExecution,
} from "@/components/automata/model";
import { astToSyntaxTree } from "@/components/regular-expression/engine-adapters";
import {
  astChildren,
  astNodeDepth,
  findAstNode,
  traverseAst,
} from "@/features/regular-expression/model";
import { parseRegularExpression } from "@/features/regular-expression/parser";
import { constructEpsilonNFA } from "@/features/regular-expression/thompson";
import {
  resetAutomatonExecutionState,
  simulateAutomatonState,
  stepAutomatonState,
  type AutomatonEngineError,
} from "@/features/automata-agent/lib/automaton-engine";
import {
  convertNfaToDfa,
  type SubsetConstructionStep,
} from "@/features/automata-agent/lib/subset-construction";
import {
  applyConstruction,
  applyConversion,
  isCurrentExpressionAutomaton,
  replaceRegularExpression,
  selectedRegularExpressionAutomaton,
  syncSelectedAutomatonView,
  type RegularExpressionAgentError,
  type RegularExpressionAgentState,
} from "@/features/regular-expression-agent/lib/agent-state";
import {
  fail,
  succeed,
  type RegularExpressionToolContext,
} from "@/features/regular-expression-agent/tools/tool-context";

function executionControllerError(
  error: AutomatonEngineError,
): RegularExpressionAgentError {
  if (
    error.code === "AUTOMATON_NOT_FOUND" ||
    error.code === "INVALID_AUTOMATON"
  ) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }
  return {
    code: "EXECUTION_ERROR",
    message: error.message,
    details: { ...error.details, engineCode: error.code },
  };
}

const expressionSchema = z
  .string()
  .min(1)
  .describe(
    "A Theory of Computation regular expression using literals, ε, ∅, |, *, and parentheses.",
  );

function commit(
  ctx: RegularExpressionToolContext,
  next: RegularExpressionAgentState,
  operation: string,
  summary: string,
  data?: unknown,
) {
  ctx.commit(next);
  return succeed(ctx, operation, summary, data);
}

function requireExpression(
  ctx: RegularExpressionToolContext,
  operation: string,
) {
  if (ctx.state.expression) return { expression: ctx.state.expression };
  return {
    outcome: fail(ctx, operation, {
      code: "REGULAR_EXPRESSION_NOT_FOUND",
      message: "Create a regular expression first.",
    }),
  };
}

function requireCurrentAutomaton(
  ctx: RegularExpressionToolContext,
  operation: string,
) {
  const automaton = selectedRegularExpressionAutomaton(ctx.state);
  if (!automaton) {
    return {
      outcome: fail(ctx, operation, {
        code: "AUTOMATON_NOT_FOUND",
        message: "Construct or select an automaton first.",
      }),
    };
  }
  if (!isCurrentExpressionAutomaton(ctx.state, automaton.id)) {
    return {
      outcome: fail(ctx, operation, {
        code: "STALE_STATE",
        message:
          "The selected automaton was not generated from the current expression.",
        details: {
          automatonId: automaton.id,
          expressionVersion: ctx.state.expressionVersion,
        },
      }),
    };
  }
  return { automaton };
}

function parseForMutation(
  ctx: RegularExpressionToolContext,
  operation: string,
  source: string,
) {
  const parsed = parseRegularExpression(source);
  if (parsed.ok) return { model: parsed.value };
  return {
    outcome: fail(ctx, operation, {
      code: "INVALID_REGULAR_EXPRESSION",
      message:
        parsed.errors[0]?.message ?? "The regular expression is invalid.",
      details: { expression: source, errors: parsed.errors },
    }),
  };
}

function expressionSummary(state: RegularExpressionAgentState) {
  const expression = state.expression;
  if (!expression) return null;
  const nodes = traverseAst(expression.root);
  const operators = nodes
    .filter((node) =>
      ["union", "concatenation", "kleene-star"].includes(node.type),
    )
    .map((node) => ({ id: node.id, type: node.type, span: node.span }));

  return {
    expression: expression.source,
    expressionVersion: state.expressionVersion,
    valid: true,
    alphabet: expression.alphabet,
    ast: expression.root,
    nodeCount: nodes.length,
    operators,
  };
}

function executionData(
  automaton: Automaton,
  input: string,
  execution: AutomatonExecution,
) {
  return {
    execution,
    accepted:
      execution.result === "accepted"
        ? true
        : execution.result === "rejected"
          ? false
          : undefined,
    input,
    trace: execution.steps,
    finalStates: execution.currentStates,
    acceptingStates: automaton.acceptStates,
    executionStepCount: execution.steps.length,
  };
}

function mirroredExecution(
  automaton: Automaton,
  execution: AutomatonExecution,
  previousSelected: AutomatonExecution | null | undefined,
  previousMirror: AutomatonExecution | null | undefined,
  wasConversionPreview: boolean,
): AutomatonExecution {
  const continuing =
    !wasConversionPreview &&
    previousSelected?.executionId === execution.executionId &&
    previousMirror?.automatonId === automaton.id &&
    previousMirror.input === execution.input;
  let mirror = continuing
    ? previousMirror
    : createAutomatonExecution(automaton, execution.input);
  while (mirror.steps.length < execution.steps.length) {
    const advanced = stepAutomaton(automaton, mirror);
    if (advanced === mirror) break;
    mirror = advanced;
    if (mirror.status === "error") break;
  }
  return mirror;
}

function updateExecutionView(
  state: RegularExpressionAgentState,
  automaton: Automaton,
  execution: AutomatonExecution,
) {
  const next = structuredClone(state);
  next.automata.executions[automaton.id] = execution;
  next.view.input = execution.input;
  const inputSymbols = tokenizeAutomatonInput(automaton, execution.input);
  next.view.inputSymbols = inputSymbols;
  next.view.currentInputIndex = execution.inputIndex;
  next.view.highlightedInputIndex =
    execution.inputIndex < inputSymbols.length
      ? execution.inputIndex
      : undefined;
  next.view.executionStatus = execution.status;
  next.view.result = execution.result;
  next.view.displayMode = "expression";
  const conversion = next.conversionVersion === next.expressionVersion
    ? next.conversion
    : null;
  const source = conversion
    ? next.automata.automata[conversion.sourceAutomatonId]
    : null;
  const dfa = conversion
    ? next.automata.automata[conversion.automaton.id]
    : null;
  next.view.sourceAutomatonExecution =
    automaton.id === dfa?.id && source
      ? mirroredExecution(
          source,
          execution,
          state.view.generatedAutomatonExecution,
          state.view.sourceAutomatonExecution,
          Boolean(state.view.conversionPlaybackActive),
        )
      : null;
  next.view.generatedDfaExecution =
    automaton.id === source?.id && dfa
      ? mirroredExecution(
          dfa,
          execution,
          state.view.generatedAutomatonExecution,
          state.view.generatedDfaExecution,
          Boolean(state.view.conversionPlaybackActive),
        )
      : null;
  next.view.conversionPlaybackActive = false;
  next.view.conversionStepCount = 0;
  next.view.highlightedSourceStateIds = [];
  next.view.highlightedTargetStateIds = [];
  next.view.highlightedConversionTransitionIds = [];
  return syncSelectedAutomatonView(next);
}

function generatedAutomatonId(
  state: RegularExpressionAgentState,
  preferred: string,
) {
  let id = preferred;
  let suffix = 1;
  while (
    state.automata.automata[id] &&
    state.automatonVersions[id] !== state.expressionVersion
  ) {
    id = `${preferred}-${suffix++}`;
  }
  return id;
}

let previewSequence = 0;

function previewExecution(
  automaton: Automaton,
  execution: AutomatonExecution | undefined,
  currentStates: string[],
  activeTransitions: string[],
  visitedStates: string[],
  visitedTransitions: string[],
  previewKey: string,
): AutomatonExecution {
  const base = execution ?? createAutomatonExecution(automaton);
  const highlighted = automaton.transitions.filter((transition) =>
    activeTransitions.includes(transition.id),
  );
  const fromStates = [
    ...new Set(highlighted.map((transition) => transition.from)),
  ];
  const arrivalStates = currentStates.length
    ? currentStates
    : [...new Set(highlighted.map((transition) => transition.to))];
  const steps: AutomatonExecution["steps"] = highlighted.length
    ? [
        {
          stepIndex: 1,
          inputIndex: 0,
          symbol: null,
          fromStates,
          transitions: activeTransitions,
          toStates: arrivalStates,
          status: "paused",
          result: "unknown",
        },
      ]
    : [];
  return {
    ...base,
    executionId: `${base.executionId}:preview:${previewKey}:${++previewSequence}`,
    steps,
    stepIndex: steps.length,
    status: "paused",
    result: "unknown",
    currentStates,
    activeTransitions,
    visitedStates,
    visitedTransitions,
    transitionPhase: undefined,
  };
}

function currentConstructionStep(ctx: RegularExpressionToolContext) {
  const construction = ctx.state.construction;
  if (
    !construction ||
    ctx.state.constructionVersion !== ctx.state.expressionVersion
  ) {
    return null;
  }
  const index = Math.max(
    0,
    Math.min(
      ctx.state.view.currentConstructionStep ?? 0,
      construction.trace.length - 1,
    ),
  );
  return construction.trace[index] ?? null;
}

function currentConversionStep(ctx: RegularExpressionToolContext) {
  const conversion = ctx.state.conversion;
  if (
    !conversion ||
    ctx.state.conversionVersion !== ctx.state.expressionVersion
  ) {
    return null;
  }
  return conversion.trace[ctx.state.currentConversionStep] ?? null;
}

function conversionExplanation(step: SubsetConstructionStep) {
  const source = step.sourceStateSet.length
    ? `{${step.sourceStateSet.join(", ")}}`
    : "∅";
  const moved = step.moveResult.length
    ? `{${step.moveResult.join(", ")}}`
    : "∅";
  const closure = step.epsilonClosure.length
    ? `{${step.epsilonClosure.join(", ")}}`
    : "∅";
  return `From ${source}, reading ${step.symbol} reaches ${moved}; its epsilon closure is ${closure}, represented by DFA state ${step.resultingDfaStateId}.`;
}

export function createRegularExpressionTools(
  ctx: RegularExpressionToolContext,
) {
  const replaceExpression = (
    operation: "create_regular_expression" | "update_regular_expression",
    source: string,
  ) => {
    const parsed = parseForMutation(ctx, operation, source);
    if (!parsed.model) return parsed.outcome;

    const next = replaceRegularExpression(ctx.state, parsed.model);
    ctx.commit(next, {
      expressionChanged: {
        expression: parsed.model.source,
        input: next.view.input ?? "",
      },
    });
    return succeed(
      ctx,
      operation,
      operation === "create_regular_expression"
        ? `Created regular expression "${source}".`
        : `Updated the regular expression to "${source}" and invalidated its old generated artifacts.`,
      expressionSummary(next),
    );
  };

  return {
    create_regular_expression: tool({
      description:
        "Create or replace the current regular expression. Validates and parses it, updates the AST view, and clears stale NFA/DFA/execution state.",
      inputSchema: z.object({ expression: expressionSchema }),
      execute: async ({ expression }) =>
        replaceExpression("create_regular_expression", expression),
    }),

    update_regular_expression: tool({
      description:
        "Update the current regular expression. Invalidates every AST-dependent construction, generated automaton, conversion, and execution from the previous expression.",
      inputSchema: z.object({ expression: expressionSchema }),
      execute: async ({ expression }) =>
        replaceExpression("update_regular_expression", expression),
    }),

    validate_regular_expression: tool({
      description:
        "Validate a regular expression without changing the lesson state. Returns all parser errors, warnings, and the alphabet.",
      inputSchema: z.object({ expression: z.string() }),
      execute: async ({ expression }) => {
        const parsed = parseRegularExpression(expression);
        const data = parsed.ok
          ? {
              valid: true,
              errors: [],
              warnings: [],
              alphabet: parsed.value.alphabet,
              nodeCount: traverseAst(parsed.value.root).length,
            }
          : {
              valid: false,
              errors: parsed.errors,
              warnings: [],
              alphabet: [],
            };
        return succeed(
          ctx,
          "validate_regular_expression",
          parsed.ok
            ? `"${expression}" is a valid regular expression.`
            : `"${expression}" is invalid: ${parsed.errors[0]?.message ?? "parse error"}`,
          data,
        );
      },
    }),

    inspect_regular_expression: tool({
      description:
        "Inspect authoritative current expression, AST, construction, conversion, selected automaton, and execution state. Use before context-dependent operations.",
      inputSchema: z.object({}),
      execute: async () => {
        const required = requireExpression(ctx, "inspect_regular_expression");
        if (!required.expression) return required.outcome;
        const selected = selectedRegularExpressionAutomaton(ctx.state);
        const execution = selected
          ? ctx.state.automata.executions[selected.id]
          : undefined;
        return succeed(
          ctx,
          "inspect_regular_expression",
          `Inspected "${required.expression.source}".`,
          {
            ...expressionSummary(ctx.state),
            construction: ctx.state.construction
              ? {
                  current: (ctx.state.view.currentConstructionStep ?? 0) + 1,
                  stepCount: ctx.state.construction.trace.length,
                }
              : null,
            conversion: ctx.state.conversion
              ? {
                  sourceAutomatonId: ctx.state.conversion.sourceAutomatonId,
                  targetAutomatonId: ctx.state.conversion.automaton.id,
                  current: ctx.state.currentConversionStep + 1,
                  stepCount: ctx.state.conversion.trace.length,
                }
              : null,
            activeAutomaton: selected,
            execution: execution ?? null,
          },
        );
      },
    }),

    highlight_expression: tool({
      description:
        "Highlight one exact expression/AST node by its stable node ID. Inspect the expression first when the ID is unknown.",
      inputSchema: z.object({ nodeId: z.string().min(1) }),
      execute: async ({ nodeId }) => {
        const required = requireExpression(ctx, "highlight_expression");
        if (!required.expression) return required.outcome;
        const node = findAstNode(required.expression.root, nodeId);
        if (!node) {
          return fail(ctx, "highlight_expression", {
            code: "AST_NODE_NOT_FOUND",
            message: `AST node "${nodeId}" does not exist.`,
            details: {
              nodeId,
              available: traverseAst(required.expression.root).map(
                (item) => item.id,
              ),
            },
          });
        }
        const next = structuredClone(ctx.state);
        next.view.displayMode = "expression";
        next.view.selectedExpressionNodeId = nodeId;
        next.view.highlightedExpressionNodeIds = [nodeId];
        return commit(
          ctx,
          next,
          "highlight_expression",
          `Highlighted the ${node.type} subexpression.`,
          {
            node,
            source: required.expression.source.slice(
              node.span.start,
              node.span.end,
            ),
          },
        );
      },
    }),

    show_syntax_tree: tool({
      description:
        "Show the parsed syntax tree for the current regular expression.",
      inputSchema: z.object({}),
      execute: async () => {
        const required = requireExpression(ctx, "show_syntax_tree");
        if (!required.expression) return required.outcome;
        const next = structuredClone(ctx.state);
        const tree = astToSyntaxTree(required.expression.root);
        next.view.displayMode = "tree";
        next.view.syntaxTree = tree;
        return commit(
          ctx,
          next,
          "show_syntax_tree",
          `Showing the syntax tree for "${required.expression.source}".`,
          {
            rootId: tree.rootId,
            nodeCount: tree.nodes.length,
            nodes: tree.nodes,
          },
        );
      },
    }),

    highlight_syntax_node: tool({
      description:
        "Select and highlight an exact AST node, optionally including its whole subtree, using a stable node ID.",
      inputSchema: z.object({
        nodeId: z.string().min(1),
        includeSubtree: z.boolean().optional().default(true),
      }),
      execute: async ({ nodeId, includeSubtree }) => {
        const required = requireExpression(ctx, "highlight_syntax_node");
        if (!required.expression) return required.outcome;
        const node = findAstNode(required.expression.root, nodeId);
        if (!node) {
          return fail(ctx, "highlight_syntax_node", {
            code: "AST_NODE_NOT_FOUND",
            message: `AST node "${nodeId}" does not exist.`,
            details: { nodeId },
          });
        }
        const next = structuredClone(ctx.state);
        next.view.displayMode = "tree";
        // Group nodes retain source spans in the AST but have no visible tree box.
        let visibleNode = node;
        while (visibleNode.type === "group") {
          visibleNode = visibleNode.expression;
        }
        const visibleNodeId = visibleNode.id;
        next.view.selectedSyntaxTreeNodeId = visibleNodeId;
        next.view.highlightedSyntaxTreeNodeIds = [visibleNodeId];
        const highlightSubtree = includeSubtree !== false;
        next.view.highlightedSyntaxTreeSubtreeIds = highlightSubtree
          ? [visibleNodeId]
          : [];
        next.view.activeSyntaxTreeNodeId = visibleNodeId;
        return commit(
          ctx,
          next,
          "highlight_syntax_node",
          `Highlighted the ${node.type} syntax node${highlightSubtree ? " and its subtree" : ""}.`,
          {
            node,
            nodeType: node.type,
            expression: required.expression.source.slice(
              node.span.start,
              node.span.end,
            ),
            depth: astNodeDepth(required.expression.root, nodeId),
            children: astChildren(node).map((child) => child.id),
          },
        );
      },
    }),

    construct_epsilon_nfa: tool({
      description:
        "Run the existing Thompson engine on the current AST, preserve its structured construction trace, and display the resulting ε-NFA using the shared automata model.",
      inputSchema: z.object({}),
      execute: async () => {
        const required = requireExpression(ctx, "construct_epsilon_nfa");
        if (!required.expression) return required.outcome;
        const id = generatedAutomatonId(
          ctx.state,
          `re-v${ctx.state.expressionVersion}-epsilon-nfa`,
        );
        const result = constructEpsilonNFA(required.expression.root, id);
        if (!result.success) {
          return fail(ctx, "construct_epsilon_nfa", {
            code: "INVALID_AUTOMATON",
            message: result.error.message,
            details: { error: result.error },
          });
        }
        const next = applyConstruction(ctx.state, result.value);
        return commit(
          ctx,
          next,
          "construct_epsilon_nfa",
          `Constructed ${id} with ${result.value.automaton.states.length} states.`,
          {
            automatonId: id,
            type: "epsilon-nfa",
            states: result.value.automaton.states,
            transitions: result.value.automaton.transitions,
            startState: result.value.automaton.startState,
            acceptingStates: result.value.automaton.acceptStates,
            alphabet: result.value.automaton.alphabet,
            constructionStepCount: result.value.trace.length,
          },
        );
      },
    }),

    show_construction_step: tool({
      description:
        "Show one 1-based Thompson construction step and highlight its AST node, generated states, and transitions.",
      inputSchema: z.object({ step: z.number().int().min(1) }),
      execute: async ({ step }) => {
        const construction = ctx.state.construction;
        if (
          !construction ||
          ctx.state.constructionVersion !== ctx.state.expressionVersion
        ) {
          return fail(ctx, "show_construction_step", {
            code: "CONSTRUCTION_NOT_FOUND",
            message: "Construct the current expression's ε-NFA first.",
          });
        }
        const traceStep = construction.trace[step - 1];
        if (!traceStep) {
          return fail(ctx, "show_construction_step", {
            code: "STEP_OUT_OF_RANGE",
            message: `Construction step must be between 1 and ${construction.trace.length}.`,
            details: { requested: step, total: construction.trace.length },
          });
        }

        let next = structuredClone(ctx.state);
        next.automata.selectedAutomatonId = construction.automaton.id;
        next.view.displayMode = "construction";
        next.view.currentConstructionStep = step - 1;
        next.view.highlightedExpressionNodeIds = [traceStep.astNodeId];
        next.view.highlightedSyntaxTreeNodeIds = [traceStep.astNodeId];
        next.view.activeSyntaxTreeNodeId = traceStep.astNodeId;
        next.view.sourceAutomatonExecution = null;
        next.view.generatedDfaExecution = null;
        next.view.conversionStepCount = 0;
        next = syncSelectedAutomatonView(next);
        next.view.generatedAutomatonExecution = previewExecution(
          construction.automaton,
          next.automata.executions[construction.automaton.id],
          traceStep.highlightedStateIds,
          traceStep.highlightedTransitionIds,
          traceStep.fragment.stateIds,
          traceStep.fragment.transitionIds,
          `construction:${step}`,
        );
        next.view.executionStatus = "paused";
        next.view.result = "unknown";
        next.view.currentInputIndex = 0;
        next.view.highlightedInputIndex = undefined;
        return commit(
          ctx,
          next,
          "show_construction_step",
          `Showing Thompson step ${step}: ${traceStep.description}`,
          {
            step,
            operation: traceStep.operation,
            astNode: traceStep.astNodeId,
            createdStates: traceStep.createdStateIds,
            createdTransitions: traceStep.createdTransitionIds,
            description: traceStep.description,
          },
        );
      },
    }),

    reset_construction: tool({
      description:
        "Reset Thompson playback to its first step without deleting or rebuilding the generated ε-NFA.",
      inputSchema: z.object({}),
      execute: async () => {
        const construction = ctx.state.construction;
        if (
          !construction ||
          ctx.state.constructionVersion !== ctx.state.expressionVersion
        ) {
          return fail(ctx, "reset_construction", {
            code: "CONSTRUCTION_NOT_FOUND",
            message: "There is no current Thompson construction to reset.",
          });
        }
        let next = structuredClone(ctx.state);
        next.automata.selectedAutomatonId = construction.automaton.id;
        next.view.displayMode = "construction";
        next.view.currentConstructionStep = 0;
        next.view.highlightedExpressionNodeIds = [];
        next.view.highlightedSyntaxTreeNodeIds = [];
        next.view.activeSyntaxTreeNodeId = null;
        next.view.sourceAutomatonExecution = null;
        next.view.generatedDfaExecution = null;
        next.view.conversionStepCount = 0;
        next = syncSelectedAutomatonView(next);
        return commit(
          ctx,
          next,
          "reset_construction",
          "Reset Thompson construction playback; the generated ε-NFA was preserved.",
          {
            currentStep: 1,
            automatonId: construction.automaton.id,
            preserved: true,
          },
        );
      },
    }),

    explain_construction_step: tool({
      description:
        "Return the deterministic structured explanation for the current or specified Thompson step.",
      inputSchema: z.object({ step: z.number().int().min(1).optional() }),
      execute: async ({ step }) => {
        const construction = ctx.state.construction;
        if (
          !construction ||
          ctx.state.constructionVersion !== ctx.state.expressionVersion
        ) {
          return fail(ctx, "explain_construction_step", {
            code: "CONSTRUCTION_NOT_FOUND",
            message: "Construct the current expression's ε-NFA first.",
          });
        }
        const traceStep = step
          ? construction.trace[step - 1]
          : currentConstructionStep(ctx);
        if (!traceStep) {
          return fail(ctx, "explain_construction_step", {
            code: "STEP_OUT_OF_RANGE",
            message: `Construction step must be between 1 and ${construction.trace.length}.`,
            details: { requested: step, total: construction.trace.length },
          });
        }
        return succeed(
          ctx,
          "explain_construction_step",
          traceStep.description,
          {
            step: traceStep.step,
            operation: traceStep.operation,
            astNode: traceStep.astNodeId,
            reason: traceStep.description,
            createdStates: traceStep.createdStateIds,
            createdTransitions: traceStep.createdTransitionIds,
            fragment: traceStep.fragment,
          },
        );
      },
    }),

    simulate_automaton: tool({
      description:
        "Run an input completely through the active generated ε-NFA or DFA using the shared automata execution engine.",
      inputSchema: z.object({ input: z.string() }),
      execute: async ({ input }) => {
        const required = requireCurrentAutomaton(ctx, "simulate_automaton");
        if (!required.automaton) return required.outcome;
        const result = simulateAutomatonState(
          ctx.state.automata,
          input,
          required.automaton.id,
        );
        if (!result.success) {
          return fail(
            ctx,
            "simulate_automaton",
            executionControllerError(result.error),
          );
        }
        const stateWithExecution = structuredClone(ctx.state);
        stateWithExecution.automata = result.value.state;
        const data = executionData(
          result.value.automaton,
          input,
          result.value.execution,
        );
        const next = updateExecutionView(
          stateWithExecution,
          result.value.automaton,
          result.value.execution,
        );
        ctx.commit(next);
        if (data.execution.status === "error") {
          return fail(ctx, "simulate_automaton", {
            code: "EXECUTION_ERROR",
            message:
              data.execution.error ??
              "The automaton could not execute the input.",
            details: {
              input,
              inputIndex: data.execution.inputIndex,
              alphabet: required.automaton.alphabet,
            },
          });
        }
        return succeed(
          ctx,
          "simulate_automaton",
          `Input "${input}" was ${data.execution.result} by ${required.automaton.id}.`,
          data,
        );
      },
    }),

    step_execution: tool({
      description:
        "Advance the active generated automaton by exactly one input step. Supply input only when starting a new stepped run.",
      inputSchema: z.object({ input: z.string().optional() }),
      execute: async ({ input }) => {
        const required = requireCurrentAutomaton(ctx, "step_execution");
        if (!required.automaton) return required.outcome;
        const result = stepAutomatonState(
          ctx.state.automata,
          input,
          required.automaton.id,
        );
        if (!result.success) {
          return fail(
            ctx,
            "step_execution",
            executionControllerError(result.error),
          );
        }
        const { execution } = result.value;
        const stateWithExecution = structuredClone(ctx.state);
        stateWithExecution.automata = result.value.state;
        const next = updateExecutionView(
          stateWithExecution,
          result.value.automaton,
          execution,
        );
        ctx.commit(next);
        if (execution.status === "error") {
          return fail(ctx, "step_execution", {
            code: "EXECUTION_ERROR",
            message: execution.error ?? "Execution failed.",
            details: {
              input: execution.input,
              inputIndex: execution.inputIndex,
            },
          });
        }
        return succeed(
          ctx,
          "step_execution",
          `Advanced ${required.automaton.id} to step ${execution.stepIndex} (${execution.status}).`,
          {
            currentStates: execution.currentStates,
            currentInputSymbol: execution.steps.at(-1)?.symbol ?? null,
            activeTransitions: execution.activeTransitions,
            inputPosition: execution.inputIndex,
            result: execution.result,
            execution,
          },
        );
      },
    }),

    reset_execution: tool({
      description:
        "Reset input progress and execution highlighting without reconstructing the active automaton.",
      inputSchema: z.object({ input: z.string().optional() }),
      execute: async ({ input }) => {
        const required = requireCurrentAutomaton(ctx, "reset_execution");
        if (!required.automaton) return required.outcome;
        const result = resetAutomatonExecutionState(
          ctx.state.automata,
          input,
          required.automaton.id,
        );
        if (!result.success) {
          return fail(
            ctx,
            "reset_execution",
            executionControllerError(result.error),
          );
        }
        const { execution } = result.value;
        const stateWithExecution = structuredClone(ctx.state);
        stateWithExecution.automata = result.value.state;
        const next = updateExecutionView(
          stateWithExecution,
          result.value.automaton,
          execution,
        );
        return commit(
          ctx,
          next,
          "reset_execution",
          `Reset execution for ${required.automaton.id} without rebuilding it.`,
          { execution },
        );
      },
    }),

    convert_nfa_to_dfa: tool({
      description:
        "Produce a DFA for the current regular expression. If no generated NFA is selected, construct the intermediate ε-NFA internally and publish only the DFA result. Preserve the source internally for conversion trace and execution.",
      inputSchema: z.object({}),
      execute: async () => {
        let workingState = ctx.state;
        let source = selectedRegularExpressionAutomaton(ctx.state);
        if (!source) {
          const requiredExpression = requireExpression(ctx, "convert_nfa_to_dfa");
          if (!requiredExpression.expression) return requiredExpression.outcome;
          const sourceId = generatedAutomatonId(
            ctx.state,
            `re-v${ctx.state.expressionVersion}-epsilon-nfa`,
          );
          const built = constructEpsilonNFA(requiredExpression.expression.root, sourceId);
          if (!built.success) {
            return fail(ctx, "convert_nfa_to_dfa", {
              code: "INVALID_AUTOMATON",
              message: built.error.message,
              details: { error: built.error },
            });
          }
          // One commit after conversion: the intermediate NFA never flashes
          // onto the canvas when the user requested only a DFA.
          workingState = applyConstruction(ctx.state, built.value);
          source = built.value.automaton;
        } else {
          const required = requireCurrentAutomaton(ctx, "convert_nfa_to_dfa");
          if (!required.automaton) return required.outcome;
        }
        if (source.type !== "nfa") {
          return fail(ctx, "convert_nfa_to_dfa", {
            code: "NOT_NFA",
            message: "The active automaton is already deterministic.",
            details: { automatonId: source.id, type: source.type },
          });
        }
        const targetId = generatedAutomatonId(
          workingState,
          `${source.id}-dfa`,
        );
        const result = convertNfaToDfa(source, targetId);
        if (!result.success) {
          return fail(ctx, "convert_nfa_to_dfa", {
            code: result.error.code === "NOT_NFA" ? "NOT_NFA" : "INVALID_AUTOMATON",
            message: result.error.message,
            details: result.error.details,
          });
        }
        const next = applyConversion(workingState, result.value);
        return commit(
          ctx,
          next,
          "convert_nfa_to_dfa",
          `Created DFA ${targetId} for the current expression.`,
          {
            sourceAutomatonId: source.id,
            targetAutomatonId: targetId,
            sourceType: source.transitions.some((transition) =>
              transition.symbols.includes("ε"),
            ) ? "epsilon-nfa" : "nfa",
            targetType: "dfa",
            dfaStates: result.value.automaton.states,
            transitions: result.value.automaton.transitions,
            startState: result.value.automaton.startState,
            acceptingStates: result.value.automaton.acceptStates,
            conversionStepCount: result.value.trace.length,
          },
        );
      },
    }),

    show_conversion_step: tool({
      description:
        "Show one 1-based subset-construction step and highlight the resulting DFA state and transition.",
      inputSchema: z.object({ step: z.number().int().min(1) }),
      execute: async ({ step }) => {
        const conversion = ctx.state.conversion;
        if (
          !conversion ||
          ctx.state.conversionVersion !== ctx.state.expressionVersion
        ) {
          return fail(ctx, "show_conversion_step", {
            code: "CONVERSION_NOT_FOUND",
            message: "Convert the current NFA to a DFA first.",
          });
        }
        const traceStep = conversion.trace[step - 1];
        if (!traceStep) {
          return fail(ctx, "show_conversion_step", {
            code: "STEP_OUT_OF_RANGE",
            message: `Conversion step must be between 1 and ${conversion.trace.length}.`,
            details: { requested: step, total: conversion.trace.length },
          });
        }

        let next = structuredClone(ctx.state);
        next.currentConversionStep = step - 1;
        next.automata.selectedAutomatonId = conversion.automaton.id;
        next.view.displayMode = "expression";
        next.view.currentConversionStep = step - 1;
        next.view.conversionStepCount = conversion.trace.length;
        next.view.conversionPlaybackActive = true;
        next.view.generatedDfaExecution = null;
        next.view.highlightedSourceStateIds = traceStep.sourceStateSet;
        next.view.highlightedTargetStateIds = [traceStep.resultingDfaStateId];
        next.view.highlightedConversionTransitionIds = [
          traceStep.createdTransitionId,
        ];
        next = syncSelectedAutomatonView(next);
        next.view.generatedAutomatonExecution = previewExecution(
          conversion.automaton,
          next.automata.executions[conversion.automaton.id],
          [traceStep.resultingDfaStateId],
          [traceStep.createdTransitionId],
          [traceStep.sourceDfaStateId, traceStep.resultingDfaStateId],
          [traceStep.createdTransitionId],
          `conversion:${step}`,
        );
        const sourceAutomaton = next.automata.automata[conversion.sourceAutomatonId];
        next.view.sourceAutomatonExecution = sourceAutomaton
          ? previewExecution(
              sourceAutomaton,
              next.automata.executions[sourceAutomaton.id],
              traceStep.epsilonClosure,
              traceStep.traversedNfaTransitionIds,
              [...new Set([...traceStep.sourceStateSet, ...traceStep.epsilonClosure])],
              traceStep.traversedNfaTransitionIds,
              ["source-conversion", step].join(":"),
            )
          : null;
        next.view.executionStatus = "paused";
        next.view.result = "unknown";
        next.view.currentInputIndex = 0;
        next.view.highlightedInputIndex = undefined;

        return commit(
          ctx,
          next,
          "show_conversion_step",
          `Showing subset-construction step ${step}.`,
          {
            step,
            sourceStateSet: traceStep.sourceStateSet,
            inputSymbol: traceStep.symbol,
            moveResult: traceStep.moveResult,
            epsilonClosure: traceStep.epsilonClosure,
            resultingDfaState: traceStep.resultingDfaStateId,
            createdTransition: traceStep.createdTransitionId,
          },
        );
      },
    }),

    reset_conversion: tool({
      description:
        "Reset subset-construction playback without deleting the generated DFA or source NFA.",
      inputSchema: z.object({}),
      execute: async () => {
        const conversion = ctx.state.conversion;
        if (
          !conversion ||
          ctx.state.conversionVersion !== ctx.state.expressionVersion
        ) {
          return fail(ctx, "reset_conversion", {
            code: "CONVERSION_NOT_FOUND",
            message: "There is no current DFA conversion to reset.",
          });
        }
        let next = structuredClone(ctx.state);
        next.automata.selectedAutomatonId = conversion.automaton.id;
        next.view.displayMode = "expression";
        next.currentConversionStep = 0;
        next.view.currentConversionStep = 0;
        next.view.conversionStepCount = 0;
        next.view.conversionPlaybackActive = true;
        next.view.sourceAutomatonExecution = null;
        next.view.generatedDfaExecution = null;
        next.view.highlightedSourceStateIds = [];
        next.view.highlightedTargetStateIds = [];
        next.view.highlightedConversionTransitionIds = [];
        next = syncSelectedAutomatonView(next);
        return commit(
          ctx,
          next,
          "reset_conversion",
          "Reset conversion playback; both the source NFA and generated DFA were preserved.",
          {
            sourceAutomatonId: conversion.sourceAutomatonId,
            targetAutomatonId: conversion.automaton.id,
            preserved: true,
          },
        );
      },
    }),

    explain_conversion_step: tool({
      description:
        "Return the deterministic move and epsilon-closure facts for the current or specified subset-construction step.",
      inputSchema: z.object({ step: z.number().int().min(1).optional() }),
      execute: async ({ step }) => {
        const conversion = ctx.state.conversion;
        if (
          !conversion ||
          ctx.state.conversionVersion !== ctx.state.expressionVersion
        ) {
          return fail(ctx, "explain_conversion_step", {
            code: "CONVERSION_NOT_FOUND",
            message: "Convert the current NFA to a DFA first.",
          });
        }
        const traceStep = step
          ? conversion.trace[step - 1]
          : currentConversionStep(ctx);
        if (!traceStep) {
          return fail(ctx, "explain_conversion_step", {
            code: "STEP_OUT_OF_RANGE",
            message: `Conversion step must be between 1 and ${conversion.trace.length}.`,
            details: { requested: step, total: conversion.trace.length },
          });
        }
        const explanation = conversionExplanation(traceStep);
        return succeed(ctx, "explain_conversion_step", explanation, {
          step: traceStep.step,
          sourceStateSet: traceStep.sourceStateSet,
          symbol: traceStep.symbol,
          moveResult: traceStep.moveResult,
          epsilonClosure: traceStep.epsilonClosure,
          resultingState: traceStep.resultingDfaStateId,
          explanation,
        });
      },
    }),
  };
}

export type RegularExpressionToolSet = ReturnType<
  typeof createRegularExpressionTools
>;
export type RegularExpressionToolName = keyof RegularExpressionToolSet;
