import type { Automaton } from "@/components/automata/model";
export type TMTransition = {
  id: string;
  from: string;
  to: string;
  read: string;
  write: string;
  move: "L" | "R" | "S";
};
export type TuringMachine = {
  id: string;
  states: {
    id: string;
    label: string;
    accepting?: boolean;
    rejecting?: boolean;
  }[];
  alphabet: string[];
  tapeAlphabet: string[];
  blank: string;
  startState: string;
  acceptState?: string;
  rejectState?: string;
  transitions: TMTransition[];
  tapes?: number;
  nondeterministic?: boolean;
};
export type TMExecution = {
  input: string;
  tape: Record<number, string>;
  head: number;
  state: string;
  status: "idle" | "running" | "accepted" | "rejected" | "halted" | "error";
  step: number;
  activeTransitionId?: string;
  history: {
    state: string;
    head: number;
    tape: Record<number, string>;
    transitionId?: string;
  }[];
  error?: string;
};
export const createTMExecution = (
  tm: TuringMachine,
  input = "",
): TMExecution => ({
  input,
  tape: Object.fromEntries([...input].map((symbol, index) => [index, symbol])),
  head: 0,
  state: tm.startState,
  status: "idle",
  step: 0,
  history: [],
});
export const validateTM = (tm: TuringMachine) => {
  const ids = new Set(tm.states.map((state) => state.id));
  const issues: string[] = [];
  if (!ids.has(tm.startState)) issues.push("Choose an existing start state.");
  if (!tm.tapeAlphabet.includes(tm.blank))
    issues.push("The blank symbol must be in the tape alphabet.");
  for (const transition of tm.transitions) {
    if (!ids.has(transition.from) || !ids.has(transition.to))
      issues.push(`Transition ${transition.id} references an unknown state.`);
    if (
      !tm.tapeAlphabet.includes(transition.read) ||
      !tm.tapeAlphabet.includes(transition.write)
    )
      issues.push(
        `Transition ${transition.id} uses an undeclared tape symbol.`,
      );
  }
  return { valid: !issues.length, issues };
};
export const stepTM = (
  tm: TuringMachine,
  execution: TMExecution,
): TMExecution => {
  if (["accepted", "rejected", "halted", "error"].includes(execution.status))
    return execution;
  const symbol = execution.tape[execution.head] ?? tm.blank;
  const transition = tm.transitions.find(
    (item) => item.from === execution.state && item.read === symbol,
  );
  if (!transition)
    return {
      ...execution,
      status:
        execution.state === tm.acceptState
          ? "accepted"
          : execution.state === tm.rejectState
            ? "rejected"
            : "halted",
      activeTransitionId: undefined,
    };
  const tape = { ...execution.tape, [execution.head]: transition.write };
  const head =
    execution.head +
    (transition.move === "L" ? -1 : transition.move === "R" ? 1 : 0);
  const state = transition.to;
  const status =
    state === tm.acceptState
      ? "accepted"
      : state === tm.rejectState
        ? "rejected"
        : "running";
  return {
    ...execution,
    tape,
    head,
    state,
    status,
    step: execution.step + 1,
    activeTransitionId: transition.id,
    history: [
      ...execution.history,
      {
        state: execution.state,
        head: execution.head,
        tape: execution.tape,
        transitionId: transition.id,
      },
    ],
  };
};
export const simulateTM = (tm: TuringMachine, input: string, limit = 500) => {
  let current = createTMExecution(tm, input);
  for (
    let index = 0;
    index < limit &&
    !["accepted", "rejected", "halted"].includes(current.status);
    index++
  )
    current = stepTM(tm, current);
  return current.status === "running" || current.status === "idle"
    ? {
        ...current,
        status: "error" as const,
        error: "Simulation exceeded its step limit.",
      }
    : current;
};
export const tmAsAutomaton = (tm: TuringMachine): Automaton => ({
  id: tm.id,
  type: "nfa",
  alphabet: tm.alphabet,
  startState: tm.startState,
  acceptStates: tm.acceptState ? [tm.acceptState] : [],
  states: tm.states.map((state) => ({
    ...state,
    accepting: state.id === tm.acceptState,
  })),
  transitions: tm.transitions.map((item) => ({
    id: item.id,
    from: item.from,
    to: item.to,
    symbols: [`${item.read} → ${item.write}, ${item.move}`],
  })),
});
