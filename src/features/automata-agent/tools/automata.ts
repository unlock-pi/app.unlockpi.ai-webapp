import { tool } from "ai";
import { z } from "zod";

import {
  createAutomatonExecution,
  executeAutomaton,
  stepAutomaton,
  validateAutomaton,
} from "@/components/automata/model";
import {
  analyzeAutomaton,
  applyAutomatonOperations,
  createAutomatonDefinition,
  putAutomaton,
  replaceAutomaton,
  resolveAutomaton,
  satisfyAutomatonGoal,
  type AutomataAgentState,
  type AutomatonAnalysis,
  type AutomatonOperation,
} from "@/features/automata-agent/lib/automaton-engine";
import {
  fail,
  succeed,
  type AutomataToolContext,
} from "@/features/automata-agent/tools/tool-context";

const stateSchema = z.union([
  z.string().min(1),
  z.object({
    id: z.string().min(1),
    label: z.string().optional(),
    initial: z.boolean().optional(),
    accepting: z.boolean().optional(),
  }),
]);

const transitionSchema = z.object({
  id: z.string().optional(),
  from: z.string().min(1),
  to: z.string().min(1),
  symbols: z.array(z.string().min(1)).min(1),
});

const operationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add_state"),
    stateId: z.string().min(1),
    label: z.string().optional(),
    initial: z.boolean().optional(),
    accepting: z.boolean().optional(),
  }),
  z.object({ type: z.literal("remove_state"), stateId: z.string().min(1) }),
  z.object({
    type: z.literal("rename_state"),
    stateId: z.string().min(1),
    newStateId: z.string().min(1).optional(),
    newLabel: z.string().optional(),
  }),
  z.object({
    type: z.literal("add_transition"),
    transitionId: z.string().optional(),
    from: z.string().min(1),
    to: z.string().min(1),
    symbols: z.array(z.string().min(1)).min(1),
  }),
  z.object({ type: z.literal("remove_transition"), transitionId: z.string().min(1) }),
  z.object({
    type: z.literal("update_transition"),
    transitionId: z.string().min(1),
    from: z.string().min(1).optional(),
    to: z.string().min(1).optional(),
    symbols: z.array(z.string().min(1)).min(1).optional(),
  }),
  z.object({ type: z.literal("set_start_state"), stateId: z.string().min(1) }),
  z.object({ type: z.literal("remove_start_state") }),
  z.object({ type: z.literal("set_accept_state"), stateId: z.string().min(1) }),
  z.object({ type: z.literal("remove_accept_state"), stateId: z.string().min(1) }),
  z.object({ type: z.literal("add_symbol"), symbol: z.string().min(1) }),
  z.object({ type: z.literal("remove_symbol"), symbol: z.string().min(1) }),
]);

const analysisSchema = z.enum([
  "reachable_states",
  "unreachable_states",
  "dead_states",
  "determinism",
  "completeness",
  "state_count",
  "transition_count",
  "accepting_states",
]);

function find(ctx: AutomataToolContext, automatonId?: string) {
  const result = resolveAutomaton(ctx.state, automatonId);
  if (!result.success) return { outcome: fail(ctx, result.error) };
  return { automaton: result.value };
}

function commitState(
  ctx: AutomataToolContext,
  next: AutomataAgentState,
  summary: string,
  data?: unknown,
) {
  ctx.commit(next);
  return succeed(ctx, summary, data);
}

export function createAutomataTools(ctx: AutomataToolContext) {
  return {
    create_automaton: tool({
      description:
        "Create one DFA or NFA, either empty or from a complete formal definition. For a language request, design the states and transitions first and include them here. Use only declared state IDs in transitions, set exactly one start state, and group every symbol with the same source and destination in one transition row. For a DFA, each state/symbol pair must have exactly one destination.",
      inputSchema: z.object({
        type: z.enum(["dfa", "nfa"]),
        automatonId: z.string().min(1).optional(),
        alphabet: z.array(z.string().min(1)).optional(),
        states: z.array(stateSchema).optional(),
        transitions: z.array(transitionSchema).optional(),
        startState: z.string().optional(),
        acceptStates: z.array(z.string()).optional(),
        input: z.string().optional().describe("Optional input shown below the automaton."),
      }),
      execute: async (input) => {
        const id = input.automatonId?.trim() ||
          `${input.type}-${String(ctx.state.automatonOrder.length + 1).padStart(2, "0")}`;
        if (ctx.state.automata[id]) {
          return fail(ctx, {
            code: "DUPLICATE_ID",
            message: `Automaton "${id}" already exists.`,
            details: { automatonId: id },
          });
        }
        const automaton = createAutomatonDefinition({ ...input, automatonId: id });
        const blocking = validateAutomaton(automaton).issues.filter(
          (issue) => !["NO_STATES", "NO_START_STATE"].includes(issue.code),
        );
        if (blocking.length) {
          return fail(ctx, {
            code: "INVALID_AUTOMATON",
            message: blocking[0].message,
            details: { validationIssues: blocking },
          });
        }
        const next = putAutomaton(ctx.state, automaton, input.input ?? "");
        ctx.commit(next, { created: automaton });
        return succeed(
          ctx,
          `Created ${id}, a ${input.type.toUpperCase()} with ${automaton.states.length} states and ${automaton.transitions.length} transitions.`,
          { automaton, execution: next.executions[id] },
        );
      },
    }),

    select_automaton: tool({
      description:
        "Select which existing automaton later commands refer to. Use when more than one automaton exists or the user names an automaton.",
      inputSchema: z.object({ automatonId: z.string().min(1) }),
      execute: async ({ automatonId }) => {
        if (!ctx.state.automata[automatonId]) {
          return fail(ctx, {
            code: "AUTOMATON_NOT_FOUND",
            message: `Automaton "${automatonId}" does not exist.`,
            details: { automatonId, available: ctx.state.automatonOrder },
          });
        }
        const next = structuredClone(ctx.state);
        next.selectedAutomatonId = automatonId;
        if (!next.executions[automatonId]) {
          next.executions[automatonId] = createAutomatonExecution(next.automata[automatonId]);
        }
        return commitState(ctx, next, `Selected ${automatonId}.`, {
          automaton: next.automata[automatonId],
          execution: next.executions[automatonId],
        });
      },
    }),

    inspect_automaton: tool({
      description:
        "Read authoritative automaton or execution state. Use this instead of conversational memory before making context-dependent changes.",
      inputSchema: z.object({
        automatonId: z.string().optional(),
        sections: z.array(z.enum([
          "states",
          "transitions",
          "alphabet",
          "start_state",
          "accepting_states",
          "execution",
        ])).optional(),
      }),
      execute: async ({ automatonId, sections }) => {
        const found = find(ctx, automatonId);
        if (!found.automaton) return found.outcome;
        const automaton = found.automaton;
        const all = {
          id: automaton.id,
          type: automaton.type,
          states: automaton.states,
          transitions: automaton.transitions,
          alphabet: automaton.alphabet,
          start_state: automaton.startState,
          accepting_states: automaton.acceptStates,
          execution: ctx.state.executions[automaton.id] ?? createAutomatonExecution(automaton),
        };
        const data = sections?.length
          ? Object.fromEntries(sections.map((section) => [section, all[section]]))
          : all;
        return succeed(ctx, `Inspected ${automaton.id}.`, data);
      },
    }),

    modify_automaton: tool({
      description:
        "Atomically add, remove, rename, or update states, transitions, start/accepting states, and alphabet symbols. All operations succeed together or none are committed.",
      inputSchema: z.object({
        automatonId: z.string().optional(),
        operations: z.array(operationSchema).min(1),
      }),
      execute: async ({ automatonId, operations }) => {
        const found = find(ctx, automatonId);
        if (!found.automaton) return found.outcome;
        const result = applyAutomatonOperations(
          found.automaton,
          operations as AutomatonOperation[],
        );
        if (!result.success) return fail(ctx, result.error);
        const next = replaceAutomaton(ctx.state, result.value);
        ctx.commit(next, { definitionChanged: result.value });
        return succeed(ctx, `Applied ${operations.length} change(s) to ${result.value.id}.`, {
          automaton: result.value,
          validation: validateAutomaton(result.value),
        });
      },
    }),

    validate_automaton: tool({
      description:
        "Deterministically validate the selected DFA or NFA and return every formal issue.",
      inputSchema: z.object({ automatonId: z.string().optional() }),
      execute: async ({ automatonId }) => {
        const found = find(ctx, automatonId);
        if (!found.automaton) return found.outcome;
        const validation = validateAutomaton(found.automaton);
        return succeed(
          ctx,
          validation.valid
            ? `${found.automaton.id} is a valid ${found.automaton.type.toUpperCase()}.`
            : `${found.automaton.id} is not valid: ${validation.issues.map((issue) => issue.message).join(" ")}`,
          validation,
        );
      },
    }),

    simulate_automaton: tool({
      description:
        "Run an input completely through a DFA or NFA and return acceptance, the complete trace, visited states/transitions, and final states.",
      inputSchema: z.object({
        automatonId: z.string().optional(),
        input: z.string(),
      }),
      execute: async ({ automatonId, input }) => {
        const found = find(ctx, automatonId);
        if (!found.automaton) return found.outcome;
        const validation = validateAutomaton(found.automaton);
        if (!validation.valid) {
          return fail(ctx, {
            code: "INVALID_AUTOMATON",
            message: "Fix validation errors before simulating.",
            details: { validationIssues: validation.issues },
          });
        }
        const execution = executeAutomaton(found.automaton, input);
        const next = structuredClone(ctx.state);
        next.executions[found.automaton.id] = execution;
        ctx.commit(next);
        return succeed(ctx, `Input "${input}" was ${execution.result}.`, {
          result: execution.result,
          finalStates: execution.currentStates,
          visitedStates: execution.visitedStates,
          visitedTransitions: execution.visitedTransitions,
          steps: execution.steps,
          execution,
        });
      },
    }),

    step_execution: tool({
      description:
        "Advance exactly one input step without changing the automaton. Pass input only to begin a new stepped execution.",
      inputSchema: z.object({
        automatonId: z.string().optional(),
        input: z.string().optional(),
      }),
      execute: async ({ automatonId, input }) => {
        const found = find(ctx, automatonId);
        if (!found.automaton) return found.outcome;
        const validation = validateAutomaton(found.automaton);
        if (!validation.valid) {
          return fail(ctx, {
            code: "INVALID_AUTOMATON",
            message: "Fix validation errors before stepping.",
            details: { validationIssues: validation.issues },
          });
        }
        let execution = ctx.state.executions[found.automaton.id] ??
          createAutomatonExecution(found.automaton, input ?? "");
        if (input !== undefined && input !== execution.input) {
          execution = createAutomatonExecution(found.automaton, input);
        }
        execution = stepAutomaton(found.automaton, execution);
        const next = structuredClone(ctx.state);
        next.executions[found.automaton.id] = execution;
        ctx.commit(next);
        return succeed(ctx, `Advanced ${found.automaton.id} to step ${execution.stepIndex} (${execution.status}).`, {
          currentStates: execution.currentStates,
          currentInputSymbol: execution.steps.at(-1)?.symbol ?? null,
          activeTransitions: execution.activeTransitions,
          inputPosition: execution.inputIndex,
          executionStep: execution.steps.at(-1) ?? null,
          execution,
        });
      },
    }),

    reset_execution: tool({
      description:
        "Reset execution progress and highlights while preserving the formal automaton, layout, and Puck block.",
      inputSchema: z.object({
        automatonId: z.string().optional(),
        input: z.string().optional(),
      }),
      execute: async ({ automatonId, input }) => {
        const found = find(ctx, automatonId);
        if (!found.automaton) return found.outcome;
        const previous = ctx.state.executions[found.automaton.id];
        const execution = createAutomatonExecution(
          found.automaton,
          input ?? previous?.input ?? "",
        );
        const next = structuredClone(ctx.state);
        next.executions[found.automaton.id] = execution;
        ctx.commit(next);
        return succeed(ctx, `Reset execution for ${found.automaton.id}.`, { execution });
      },
    }),

    satisfy_automaton_goal: tool({
      description:
        "Make one or more inputs accepted or rejected using a minimal valid structural change, then validate and simulate every target to verify it.",
      inputSchema: z.object({
        automatonId: z.string().optional(),
        goal: z.object({
          type: z.enum(["accept", "reject"]),
          inputs: z.array(z.string()).min(1),
        }),
        strategy: z.literal("minimal_change").optional(),
      }),
      execute: async ({ automatonId, goal }) => {
        const found = find(ctx, automatonId);
        if (!found.automaton) return found.outcome;
        const result = satisfyAutomatonGoal(found.automaton, goal);
        if (!result.success) return fail(ctx, result.error);
        const next = replaceAutomaton(ctx.state, result.value.automaton);
        const last = result.value.verification.at(-1);
        if (last) next.executions[result.value.automaton.id] = last.execution;
        ctx.commit(next, { definitionChanged: result.value.automaton });
        return succeed(ctx, `Goal satisfied for ${goal.inputs.length} input(s) with ${result.value.changes.length} change(s).`, {
          changes: result.value.changes,
          validation: validateAutomaton(result.value.automaton),
          verification: result.value.verification,
        });
      },
    }),

    analyze_automaton: tool({
      description:
        "Analyze reachable, unreachable, or dead states; determinism; completeness; counts; or accepting states.",
      inputSchema: z.object({
        automatonId: z.string().optional(),
        analysis: analysisSchema,
      }),
      execute: async ({ automatonId, analysis }) => {
        const found = find(ctx, automatonId);
        if (!found.automaton) return found.outcome;
        const result = analyzeAutomaton(found.automaton, analysis as AutomatonAnalysis);
        return succeed(ctx, `Computed ${analysis.replaceAll("_", " ")} for ${found.automaton.id}.`, {
          analysis,
          result,
        });
      },
    }),
  };
}

export type AutomataToolSet = ReturnType<typeof createAutomataTools>;
export type AutomataToolName = keyof AutomataToolSet;
