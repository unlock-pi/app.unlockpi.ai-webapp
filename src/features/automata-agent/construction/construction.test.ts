import { describe, expect, test } from "bun:test";
import { executeAutomaton } from "@/components/automata/model";
import { createAutomatonDefinition } from "@/features/automata-agent/lib/automaton-engine";
import { parseRegularExpression } from "@/features/regular-expression/parser";
import { constructEpsilonNFA } from "@/features/regular-expression/thompson";
import { convertNfaToDfa } from "@/features/automata-agent/lib/subset-construction";
import { constructionView, validateConstructionPlan } from "./automata-construction";
import { timelineFromThompson, timelineFromSubsetConstruction } from "./trace-adapters";
import type { TeachingStep } from "@/features/toc/construction/timeline";

describe("automata construction adapters", () => {
  test("builds the ending-01 DFA without exposing future states", () => {
    const automaton = createAutomatonDefinition({ automatonId: "ending01", type: "dfa", alphabet: ["0", "1"], states: ["q0", "q1", "q2"], startState: "q0", acceptStates: ["q2"], transitions: [
      { id: "t0", from: "q0", to: "q1", symbols: ["0"] }, { id: "t1", from: "q0", to: "q0", symbols: ["1"] },
      { id: "t2", from: "q1", to: "q1", symbols: ["0"] }, { id: "t3", from: "q1", to: "q2", symbols: ["1"] },
      { id: "t4", from: "q2", to: "q1", symbols: ["0"] }, { id: "t5", from: "q2", to: "q0", symbols: ["1"] },
    ] });
    const steps: TeachingStep[] = [
      ...automaton.states.map((state) => ({ id: state.id, action: { type: "create_state" as const, stateId: state.id }, narration: `Create ${state.id}.` })),
      { id: "initial", action: { type: "set_initial_state", stateId: "q0" }, narration: "Start at q0." },
      { id: "accept", action: { type: "set_accepting_state", stateId: "q2" }, narration: "Accept at q2." },
      ...automaton.transitions.map((edge) => ({ id: edge.id, action: { type: "create_transition" as const, transitionId: edge.id }, narration: "Create this transition." })),
    ];
    validateConstructionPlan(automaton, steps);
    const view = constructionView(automaton.id, { mode: "building", steps, currentStep: 0, token: "first", animation: "running", narration: "speaking" });
    expect(view.visibleStates).toEqual(["q0"]);
    expect(view.visibleTransitions).toEqual([]);
    expect(view.initialState).toBe(null);
    expect(executeAutomaton(automaton, "1101").result).toBe("accepted");
    expect(executeAutomaton(automaton, "011").result).toBe("rejected");
    let rejected = false;
    try { validateConstructionPlan(automaton, [{ id: "bad", action: { type: "create_transition", transitionId: "t0" }, narration: "Bad order." }]); } catch { rejected = true; }
    expect(rejected).toBe(true);
  });
  test("adapts existing Thompson and subset traces without new algorithms", () => {
    const parsed = parseRegularExpression("(a|b)*");
    if (!parsed.ok) throw new Error("Parse failed");
    const thompson = constructEpsilonNFA(parsed.value.root);
    if (!thompson.success) throw new Error("Thompson failed");
    validateConstructionPlan(thompson.value.automaton, timelineFromThompson(thompson.value));
    const subset = convertNfaToDfa(thompson.value.automaton);
    if (!subset.success) throw new Error("Subset failed");
    validateConstructionPlan(subset.value.automaton, timelineFromSubsetConstruction(subset.value));
  });
});
