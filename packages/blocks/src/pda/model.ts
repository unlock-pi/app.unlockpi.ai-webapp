import type { Automaton, AutomatonState } from "@unlockpi/blocks/automata";
import { isEpsilon, normaliseSymbol, tokenizeAutomatonInput, unique } from "@unlockpi/blocks/automata";

export type PDAAcceptanceMode = "final_state" | "empty_stack" | "both";
export type PDAStackOperation = "push" | "pop" | "replace" | "noop";
export type PDATransition = { id: string; from: string; to: string; inputSymbol: string; stackTop: string; operation: PDAStackOperation; pushSymbols?: string[] };
export type PDA = { id: string; states: AutomatonState[]; inputAlphabet: string[]; stackAlphabet: string[]; transitions: PDATransition[]; startState: string; acceptStates: string[]; initialStackSymbol?: string; acceptanceMode: PDAAcceptanceMode };
export type PDAConfiguration = { id: string; state: string; inputIndex: number; stack: string[]; via?: string };
export type PDAExecution = { input: string; inputSymbols: string[]; configurations: PDAConfiguration[]; activeTransitionIds: string[]; visitedTransitionIds: string[]; step: number; status: "idle" | "running" | "accepted" | "rejected" | "error"; result: "unknown" | "accepted" | "rejected"; error?: string };
export type PDAValidation = { valid: boolean; issues: string[] };

const epsilon = (value: string) => isEpsilon(value);
const id = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `pda-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function validatePDA(pda: PDA): PDAValidation {
  const issues: string[] = [];
  const states = new Set(pda.states.map((state) => state.id));
  if (!pda.states.length) issues.push("A PDA needs at least one state.");
  if (!states.has(pda.startState)) issues.push("Choose an existing start state.");
  if (new Set(pda.states.map((state) => state.id)).size !== pda.states.length) issues.push("State IDs must be unique.");
  if (new Set(pda.transitions.map((transition) => transition.id)).size !== pda.transitions.length) issues.push("Transition IDs must be unique.");
  for (const transition of pda.transitions) {
    if (!states.has(transition.from) || !states.has(transition.to)) issues.push(`Transition "${transition.id}" references an unknown state.`);
    if (!epsilon(transition.inputSymbol) && !pda.inputAlphabet.includes(normaliseSymbol(transition.inputSymbol))) issues.push(`Transition "${transition.id}" uses an undeclared input symbol.`);
    if (!epsilon(transition.stackTop) && !pda.stackAlphabet.includes(transition.stackTop)) issues.push(`Transition "${transition.id}" uses an undeclared stack symbol.`);
    for (const symbol of transition.pushSymbols ?? []) if (!pda.stackAlphabet.includes(symbol)) issues.push(`Transition "${transition.id}" pushes undeclared stack symbol "${symbol}".`);
  }
  return { valid: issues.length === 0, issues: unique(issues) };
}

export function createPDAExecution(pda: PDA, input = ""): PDAExecution {
  const validation = validatePDA(pda);
  const inputSymbols = tokenizeAutomatonInput({ id: pda.id, type: "nfa", alphabet: pda.inputAlphabet, states: pda.states, transitions: [], startState: pda.startState, acceptStates: pda.acceptStates }, input);
  return { input, inputSymbols, configurations: validation.valid ? [{ id: id(), state: pda.startState, inputIndex: 0, stack: pda.initialStackSymbol ? [pda.initialStackSymbol] : [] }] : [], activeTransitionIds: [], visitedTransitionIds: [], step: 0, status: validation.valid ? "idle" : "error", result: "unknown", error: validation.issues[0] };
}

function applies(transition: PDATransition, configuration: PDAConfiguration, symbols: string[]) {
  const symbol = symbols[configuration.inputIndex];
  return transition.from === configuration.state && (epsilon(transition.inputSymbol) || transition.inputSymbol === symbol) && (epsilon(transition.stackTop) || transition.stackTop === configuration.stack.at(-1));
}
function apply(transition: PDATransition, configuration: PDAConfiguration): PDAConfiguration {
  let stack = [...configuration.stack];
  if (transition.operation === "pop") stack = stack.slice(0, -1);
  if (transition.operation === "replace") stack = [...stack.slice(0, -1), ...(transition.pushSymbols ?? [])];
  if (transition.operation === "push") stack = [...stack, ...(transition.pushSymbols ?? [])];
  return { id: id(), state: transition.to, inputIndex: configuration.inputIndex + (epsilon(transition.inputSymbol) ? 0 : 1), stack, via: transition.id };
}
function accepted(pda: PDA, configuration: PDAConfiguration, symbols: string[]) {
  if (configuration.inputIndex !== symbols.length) return false;
  const final = pda.acceptStates.includes(configuration.state);
  const empty = configuration.stack.length === 0;
  return pda.acceptanceMode === "final_state" ? final : pda.acceptanceMode === "empty_stack" ? empty : final && empty;
}
export function stepPDA(pda: PDA, execution: PDAExecution): PDAExecution {
  if (["accepted", "rejected", "error"].includes(execution.status)) return execution;
  const next = execution.configurations.flatMap((configuration) => pda.transitions.filter((transition) => applies(transition, configuration, execution.inputSymbols)).map((transition) => apply(transition, configuration)));
  const transitionIds = unique(next.map((configuration) => configuration.via!).filter(Boolean));
  const acceptedBranches = next.filter((configuration) => accepted(pda, configuration, execution.inputSymbols));
  const exhausted = next.filter((configuration) => configuration.inputIndex < execution.inputSymbols.length || pda.transitions.some((transition) => applies(transition, configuration, execution.inputSymbols)));
  const status = acceptedBranches.length ? "accepted" : next.length === 0 || exhausted.length === 0 ? "rejected" : "running";
  return { ...execution, configurations: next, activeTransitionIds: transitionIds, visitedTransitionIds: unique([...execution.visitedTransitionIds, ...transitionIds]), step: execution.step + 1, status, result: status === "accepted" ? "accepted" : status === "rejected" ? "rejected" : "unknown" };
}
export function simulatePDA(pda: PDA, input: string, limit = 200) {
  let execution = createPDAExecution(pda, input);
  for (let index = 0; index < limit && !["accepted", "rejected", "error"].includes(execution.status); index++) execution = stepPDA(pda, execution);
  if (execution.status === "running" || execution.status === "idle") return { ...execution, status: "error" as const, error: "Simulation exceeded its step limit." };
  return execution;
}

/** Adapter: the established automata graph remains the only graph renderer. */
export function pdaAsAutomaton(pda: PDA): Automaton {
  return { id: pda.id, type: "nfa", alphabet: pda.inputAlphabet, states: pda.states, startState: pda.startState, acceptStates: pda.acceptStates, transitions: pda.transitions.map((transition) => ({ id: transition.id, from: transition.from, to: transition.to, symbols: [`${epsilon(transition.inputSymbol) ? "ε" : transition.inputSymbol}, ${epsilon(transition.stackTop) ? "ε" : transition.stackTop} → ${transition.operation}${transition.pushSymbols?.length ? ` ${transition.pushSymbols.join("")}` : ""}`] })) };
}
