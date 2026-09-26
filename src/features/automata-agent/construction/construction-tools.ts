import { tool } from "ai";
import { z } from "zod";
import { createAutomatonDefinition } from "@/features/automata-agent/lib/automaton-engine";
import type { Automaton } from "@/components/automata/model";
import type { TeachingStep, TeachingTimelineState } from "@/features/toc/construction/timeline";
import { validateConstructionPlan } from "./automata-construction";

const action = z.union([
  z.object({ type: z.enum(["create_state", "set_initial_state", "set_accepting_state", "highlight_state"]), stateId: z.string().min(1) }).strict(),
  z.object({ type: z.enum(["create_transition", "highlight_transition", "animate_transition"]), transitionId: z.string().min(1) }).strict(),
  z.object({ type: z.enum(["explain", "pause", "complete"]) }).strict(),
]);
const stepSchema = z.object({
  id: z.string().min(1), action, narration: z.string().min(1),
  animationMs: z.number().int().min(0).max(10_000).optional(),
}).strict();

export type ConstructionController = {
  start: (automaton: Automaton, steps: TeachingStep[], input: string) => void;
  control: (action: "step" | "pause" | "resume" | "undo" | "reset" | "complete") => void;
  narrate: (stepId: string, text: string) => void;
  inspect: () => TeachingTimelineState;
  execute: (input: string, narrations?: string[]) => void;
};

function result(operation: () => void, inspect: () => TeachingTimelineState) {
  try {
    operation();
    const state = inspect();
    return { success: true, ok: true, summary: "Construction timeline updated.", data: { mode: state.mode, currentStep: state.currentStep, totalSteps: state.steps.length } };
  } catch (error) {
    return { success: false, ok: false, error: { code: "INVALID_CONSTRUCTION", message: error instanceof Error ? error.message : "Construction failed." } };
  }
}

/** Intent-level tools, with typed semantic actions instead of DOM commands. */
export function createConstructionTools(controller?: ConstructionController) {
  return {
    start_construction: tool({
      description: "Start a narrated, progressively animated DFA/NFA construction. Supply the validated final definition and an ordered timeline. Each action and its narration run together; the next step waits for BOTH actual audio playback and visual animation completion. Do not separately speak the provided narration. State IDs and transition IDs must match the definition; create endpoints before edges and include initial/accepting marking actions.",
      inputSchema: z.object({
        automatonId: z.string().min(1), type: z.enum(["dfa", "nfa"]), alphabet: z.array(z.string().min(1)),
        states: z.array(z.object({ id: z.string().min(1), label: z.string().optional() }).strict()).min(1),
        transitions: z.array(z.object({ id: z.string().min(1), from: z.string().min(1), to: z.string().min(1), symbols: z.array(z.string().min(1)).min(1) }).strict()),
        startState: z.string().min(1), acceptStates: z.array(z.string().min(1)),
        input: z.string().optional(), steps: z.array(stepSchema).min(1),
      }).strict(),
      execute: async (input) => result(() => {
        if (!controller) throw new Error("Construction controller is unavailable.");
        const automaton = createAutomatonDefinition(input);
        const steps = input.steps as TeachingStep[];
        validateConstructionPlan(automaton, steps);
        controller.start(automaton, steps, input.input ?? "");
      }, () => controller!.inspect()),
    }),
    control_construction: tool({
      description: "Step once, pause, resume, undo the last completed action, reset, or finish the active teaching timeline. Pause cancels narration and rolls back an unfinished action; resume restarts that same conceptual step. Completion is refused until every queued action finishes.",
      inputSchema: z.object({ action: z.enum(["step", "pause", "resume", "undo", "reset", "complete"]) }).strict(),
      execute: async ({ action }) => result(() => {
        if (!controller) throw new Error("No construction controller is available.");
        controller.control(action);
      }, () => controller!.inspect()),
    }),
    animate_execution: tool({
      description: "Replay the selected completed automaton on an input as synchronized narrated steps. Reuses the shared DFA/NFA executor, starts each visual at narration start, and consumes each symbol only after its transition arrives. Do not call while a construction is unfinished.",
      inputSchema: z.object({ input: z.string(), narrations: z.array(z.string().min(1)).optional() }).strict(),
      execute: async ({ input, narrations }) => result(() => {
        if (!controller) throw new Error("No construction controller is available.");
        controller.execute(input, narrations);
      }, () => controller!.inspect()),
    }),
    narrate_step: tool({
      description: "Replace the explanation of a pending construction step by its stable ID. Cannot detach speech from a visual action or replace narration already in progress.",
      inputSchema: z.object({ stepId: z.string().min(1), text: z.string().min(1) }).strict(),
      execute: async ({ stepId, text }) => result(() => {
        if (!controller) throw new Error("No construction controller is available.");
        controller.narrate(stepId, text);
      }, () => controller!.inspect()),
    }),
  };
}
