import {
  createAutomatonExecution,
  epsilonClosure,
  executeAutomaton,
  isEpsilon,
  normaliseAutomaton,
  normaliseSymbol,
  tokenizeAutomatonInput,
  unique,
  validateAutomaton,
  type Automaton,
  type AutomatonExecution,
  type AutomatonState,
  type AutomatonTransition,
  type AutomatonType,
  type AutomatonValidationIssue,
} from "@/components/automata/model";

export type AutomataAgentState = {
  activeCanvasId: string | null;
  automata: Record<string, Automaton>;
  automatonOrder: string[];
  selectedAutomatonId: string | null;
  executions: Record<string, AutomatonExecution>;
};

export type AutomatonOperation =
  | { type: "add_state"; stateId: string; label?: string; initial?: boolean; accepting?: boolean }
  | { type: "remove_state"; stateId: string }
  | { type: "rename_state"; stateId: string; newStateId?: string; newLabel?: string }
  | { type: "add_transition"; transitionId?: string; from: string; to: string; symbols: string[] }
  | { type: "remove_transition"; transitionId: string }
  | {
      type: "update_transition";
      transitionId: string;
      from?: string;
      to?: string;
      symbols?: string[];
    }
  | { type: "set_start_state"; stateId: string }
  | { type: "remove_start_state" }
  | { type: "set_accept_state"; stateId: string }
  | { type: "remove_accept_state"; stateId: string }
  | { type: "add_symbol"; symbol: string }
  | { type: "remove_symbol"; symbol: string };

export type AutomatonEngineError = {
  code:
    | "AUTOMATON_NOT_FOUND"
    | "STATE_NOT_FOUND"
    | "TRANSITION_NOT_FOUND"
    | "DUPLICATE_ID"
    | "INVALID_OPERATION"
    | "INVALID_AUTOMATON"
    | "GOAL_UNSATISFIED";
  message: string;
  details?: Record<string, unknown>;
};

export type EngineResult<T> =
  | { success: true; value: T }
  | { success: false; error: AutomatonEngineError };

export type GoalChange = {
  operation: string;
  description: string;
};

export function createInitialAutomataState(canvasId: string | null = null): AutomataAgentState {
  return {
    activeCanvasId: canvasId,
    automata: {},
    automatonOrder: [],
    selectedAutomatonId: null,
    executions: {},
  };
}

export function selectedAutomaton(state: AutomataAgentState): Automaton | null {
  return state.selectedAutomatonId
    ? state.automata[state.selectedAutomatonId] ?? null
    : null;
}

export function resolveAutomaton(
  state: AutomataAgentState,
  automatonId?: string,
): EngineResult<Automaton> {
  const id = automatonId ?? state.selectedAutomatonId;
  const automaton = id ? state.automata[id] : undefined;
  return automaton
    ? { success: true, value: automaton }
    : {
        success: false,
        error: {
          code: "AUTOMATON_NOT_FOUND",
          message: id
            ? `Automaton "${id}" does not exist.`
            : "No automaton is selected. Create or select one first.",
          details: id ? { automatonId: id } : undefined,
        },
      };
}

export function describeAutomataState(state: AutomataAgentState): string {
  const automaton = selectedAutomaton(state);
  if (!automaton) {
    return state.automatonOrder.length
      ? `No automaton selected. Available: ${state.automatonOrder.join(", ")}.`
      : "No automaton on the board.";
  }
  const execution = state.executions[automaton.id];
  return [
    `${automaton.id} (${automaton.type.toUpperCase()}): ${automaton.states.length} states, ${automaton.transitions.length} transitions`,
    `alphabet {${automaton.alphabet.join(", ")}}, start ${automaton.startState || "unset"}, accepting {${automaton.acceptStates.join(", ")}}`,
    execution
      ? `execution ${execution.status}, input "${execution.input}", position ${execution.inputIndex}, current {${execution.currentStates.join(", ")}}`
      : "execution idle",
  ].join("; ");
}

function nextId(existing: readonly string[], prefix: string) {
  const used = new Set(existing);
  let index = 0;
  while (used.has(`${prefix}${index}`)) index++;
  return `${prefix}${index}`;
}

export function createAutomatonDefinition(input: {
  automatonId: string;
  type: AutomatonType;
  alphabet?: string[];
  states?: Array<string | { id: string; label?: string; initial?: boolean; accepting?: boolean }>;
  transitions?: Array<{ id?: string; from: string; to: string; symbols: string[] }>;
  startState?: string;
  acceptStates?: string[];
}): Automaton {
  const states: AutomatonState[] = (input.states ?? []).map((state) =>
    typeof state === "string"
      ? { id: state.trim(), label: state.trim() }
      : {
          id: state.id.trim(),
          label: state.label?.trim() || state.id.trim(),
          initial: state.initial,
          accepting: state.accepting,
        },
  );
  const startState =
    input.startState?.trim() ||
    states.find((state) => state.initial)?.id ||
    states[0]?.id ||
    "";
  const acceptStates = unique([
    ...(input.acceptStates ?? []).map((id) => id.trim()),
    ...states.filter((state) => state.accepting).map((state) => state.id),
  ].filter(Boolean));
  const usedTransitionIds: string[] = [];
  const transitions: AutomatonTransition[] = (input.transitions ?? []).map((transition) => {
    const id = transition.id?.trim() || nextId(usedTransitionIds, "t");
    usedTransitionIds.push(id);
    return {
      id,
      from: transition.from.trim(),
      to: transition.to.trim(),
      symbols: transition.symbols.map(normaliseSymbol).filter(Boolean),
    };
  });
  return normaliseAutomaton({
    id: input.automatonId.trim(),
    type: input.type,
    alphabet: (input.alphabet ?? []).map(normaliseSymbol).filter(Boolean),
    states,
    transitions,
    startState,
    acceptStates,
  });
}

function operationError(
  message: string,
  details?: Record<string, unknown>,
  code: AutomatonEngineError["code"] = "INVALID_OPERATION",
): EngineResult<never> {
  return { success: false, error: { code, message, details } };
}

function stateExists(automaton: Automaton, stateId: string) {
  return automaton.states.some((state) => state.id === stateId);
}

function applyOne(
  automaton: Automaton,
  operation: AutomatonOperation,
): EngineResult<Automaton> {
  const draft = structuredClone(automaton);
  switch (operation.type) {
    case "add_state": {
      const stateId = operation.stateId.trim();
      if (!stateId) return operationError("State ID cannot be empty.");
      if (stateExists(draft, stateId)) {
        return operationError(`State "${stateId}" already exists.`, { stateId }, "DUPLICATE_ID");
      }
      draft.states.push({
        id: stateId,
        label: operation.label?.trim() || stateId,
      });
      if (operation.initial) draft.startState = stateId;
      if (operation.accepting) draft.acceptStates.push(stateId);
      break;
    }
    case "remove_state": {
      if (!stateExists(draft, operation.stateId)) {
        return operationError(`State "${operation.stateId}" does not exist.`, { stateId: operation.stateId }, "STATE_NOT_FOUND");
      }
      draft.states = draft.states.filter((state) => state.id !== operation.stateId);
      draft.transitions = draft.transitions.filter(
        (transition) => transition.from !== operation.stateId && transition.to !== operation.stateId,
      );
      draft.acceptStates = draft.acceptStates.filter((id) => id !== operation.stateId);
      if (draft.startState === operation.stateId) draft.startState = "";
      break;
    }
    case "rename_state": {
      const state = draft.states.find((candidate) => candidate.id === operation.stateId);
      if (!state) {
        return operationError(`State "${operation.stateId}" does not exist.`, { stateId: operation.stateId }, "STATE_NOT_FOUND");
      }
      const newId = operation.newStateId?.trim();
      if (newId && newId !== operation.stateId && stateExists(draft, newId)) {
        return operationError(`State "${newId}" already exists.`, { stateId: newId }, "DUPLICATE_ID");
      }
      if (!newId && operation.newLabel === undefined) {
        return operationError("rename_state needs newStateId or newLabel.");
      }
      if (newId) {
        state.id = newId;
        if (state.label === operation.stateId && operation.newLabel === undefined) state.label = newId;
        for (const transition of draft.transitions) {
          if (transition.from === operation.stateId) transition.from = newId;
          if (transition.to === operation.stateId) transition.to = newId;
        }
        if (draft.startState === operation.stateId) draft.startState = newId;
        draft.acceptStates = draft.acceptStates.map((id) => id === operation.stateId ? newId : id);
      }
      if (operation.newLabel !== undefined) state.label = operation.newLabel.trim() || state.id;
      break;
    }
    case "add_transition": {
      if (!stateExists(draft, operation.from) || !stateExists(draft, operation.to)) {
        return operationError("A transition must connect existing states.", {
          from: operation.from,
          to: operation.to,
        });
      }
      const id = operation.transitionId?.trim() ||
        nextId(draft.transitions.map((transition) => transition.id), "t");
      if (draft.transitions.some((transition) => transition.id === id)) {
        return operationError(`Transition "${id}" already exists.`, { transitionId: id }, "DUPLICATE_ID");
      }
      draft.transitions.push({
        id,
        from: operation.from,
        to: operation.to,
        symbols: unique(operation.symbols.map(normaliseSymbol).filter(Boolean)),
      });
      break;
    }
    case "remove_transition": {
      if (!draft.transitions.some((transition) => transition.id === operation.transitionId)) {
        return operationError(`Transition "${operation.transitionId}" does not exist.`, { transitionId: operation.transitionId }, "TRANSITION_NOT_FOUND");
      }
      draft.transitions = draft.transitions.filter(
        (transition) => transition.id !== operation.transitionId,
      );
      break;
    }
    case "update_transition": {
      const transition = draft.transitions.find(
        (candidate) => candidate.id === operation.transitionId,
      );
      if (!transition) {
        return operationError(`Transition "${operation.transitionId}" does not exist.`, { transitionId: operation.transitionId }, "TRANSITION_NOT_FOUND");
      }
      if (operation.from !== undefined) transition.from = operation.from;
      if (operation.to !== undefined) transition.to = operation.to;
      if (operation.symbols !== undefined) {
        transition.symbols = unique(operation.symbols.map(normaliseSymbol).filter(Boolean));
      }
      break;
    }
    case "set_start_state":
      if (!stateExists(draft, operation.stateId)) {
        return operationError(`State "${operation.stateId}" does not exist.`, { stateId: operation.stateId }, "STATE_NOT_FOUND");
      }
      draft.startState = operation.stateId;
      break;
    case "remove_start_state":
      draft.startState = "";
      break;
    case "set_accept_state":
      if (!stateExists(draft, operation.stateId)) {
        return operationError(`State "${operation.stateId}" does not exist.`, { stateId: operation.stateId }, "STATE_NOT_FOUND");
      }
      draft.acceptStates = unique([...draft.acceptStates, operation.stateId]);
      break;
    case "remove_accept_state":
      draft.acceptStates = draft.acceptStates.filter((id) => id !== operation.stateId);
      break;
    case "add_symbol": {
      const symbol = normaliseSymbol(operation.symbol);
      if (!symbol || isEpsilon(symbol)) {
        return operationError("The input alphabet cannot contain an empty or epsilon symbol.", { symbol });
      }
      draft.alphabet = unique([...draft.alphabet, symbol]);
      break;
    }
    case "remove_symbol": {
      const symbol = normaliseSymbol(operation.symbol);
      if (draft.transitions.some((transition) => transition.symbols.includes(symbol))) {
        return operationError(
          `Cannot remove "${symbol}" while a transition still uses it.`,
          { symbol },
        );
      }
      draft.alphabet = draft.alphabet.filter((candidate) => candidate !== symbol);
      break;
    }
  }
  return { success: true, value: normaliseAutomaton(draft) };
}

const DRAFT_ISSUES = new Set<AutomatonValidationIssue["code"]>(["NO_STATES", "NO_START_STATE"]);

export function applyAutomatonOperations(
  automaton: Automaton,
  operations: AutomatonOperation[],
): EngineResult<Automaton> {
  let draft = structuredClone(automaton);
  for (const operation of operations) {
    const result = applyOne(draft, operation);
    if (!result.success) return result;
    draft = result.value;
  }
  const blocking = validateAutomaton(draft).issues.filter((issue) => !DRAFT_ISSUES.has(issue.code));
  if (blocking.length) {
    const issue = blocking[0];
    return {
      success: false,
      error: {
        code: "INVALID_AUTOMATON",
        message: issue.message,
        details: { ...issue.details, validationIssues: blocking },
      },
    };
  }
  return { success: true, value: draft };
}

export function putAutomaton(
  state: AutomataAgentState,
  automaton: Automaton,
  input = "",
): AutomataAgentState {
  const next = structuredClone(state);
  const exists = Boolean(next.automata[automaton.id]);
  next.automata[automaton.id] = structuredClone(automaton);
  if (!exists) next.automatonOrder.push(automaton.id);
  next.selectedAutomatonId = automaton.id;
  next.executions[automaton.id] = createAutomatonExecution(automaton, input);
  return next;
}

export function replaceAutomaton(
  state: AutomataAgentState,
  automaton: Automaton,
): AutomataAgentState {
  const input = state.executions[automaton.id]?.input ?? "";
  return putAutomaton(state, automaton, input);
}

export type AutomatonAnalysis =
  | "reachable_states"
  | "unreachable_states"
  | "dead_states"
  | "determinism"
  | "completeness"
  | "state_count"
  | "transition_count"
  | "accepting_states";

function reachableStates(automaton: Automaton) {
  const reachable = new Set<string>();
  const pending = automaton.startState ? [automaton.startState] : [];
  while (pending.length) {
    const state = pending.shift();
    if (!state || reachable.has(state)) continue;
    reachable.add(state);
    for (const transition of automaton.transitions) {
      if (transition.from === state && !reachable.has(transition.to)) pending.push(transition.to);
    }
  }
  return automaton.states.map((state) => state.id).filter((id) => reachable.has(id));
}

export function analyzeAutomaton(automaton: Automaton, analysis: AutomatonAnalysis) {
  const reachable = reachableStates(automaton);
  if (analysis === "reachable_states") return reachable;
  if (analysis === "unreachable_states") {
    return automaton.states.map((state) => state.id).filter((id) => !reachable.includes(id));
  }
  if (analysis === "state_count") return automaton.states.length;
  if (analysis === "transition_count") return automaton.transitions.length;
  if (analysis === "accepting_states") return [...automaton.acceptStates];
  if (analysis === "determinism") {
    const targetsByPair = new Map<string, Set<string>>();
    const conflicts: Array<{ state: string; symbol: string }> = [];
    let deterministic = true;
    for (const transition of automaton.transitions) {
      for (const symbol of transition.symbols) {
        if (isEpsilon(symbol)) {
          deterministic = false;
          conflicts.push({ state: transition.from, symbol });
          continue;
        }
        const key = JSON.stringify([transition.from, symbol]);
        const targets = targetsByPair.get(key) ?? new Set<string>();
        targets.add(transition.to);
        targetsByPair.set(key, targets);
      }
    }
    for (const [key, targets] of targetsByPair) {
      if (targets.size > 1) {
        deterministic = false;
        const [state, symbol] = JSON.parse(key) as [string, string];
        conflicts.push({ state, symbol });
      }
    }
    return { deterministic, conflicts };
  }
  if (analysis === "completeness") {
    const missing: Array<{ state: string; symbol: string }> = [];
    for (const state of automaton.states) {
      for (const symbol of automaton.alphabet) {
        if (!automaton.transitions.some(
          (transition) => transition.from === state.id && transition.symbols.includes(symbol),
        )) {
          missing.push({ state: state.id, symbol });
        }
      }
    }
    return { complete: missing.length === 0, missing };
  }

  const reverse = new Map<string, string[]>();
  for (const transition of automaton.transitions) {
    reverse.set(transition.to, [...(reverse.get(transition.to) ?? []), transition.from]);
  }
  const canReachAccept = new Set(automaton.acceptStates);
  const pending = [...automaton.acceptStates];
  while (pending.length) {
    const state = pending.shift();
    if (!state) continue;
    for (const predecessor of reverse.get(state) ?? []) {
      if (!canReachAccept.has(predecessor)) {
        canReachAccept.add(predecessor);
        pending.push(predecessor);
      }
    }
  }
  return automaton.states
    .map((state) => state.id)
    .filter((id) => reachable.includes(id) && !canReachAccept.has(id));
}

function tracePath(automaton: Automaton, input: string) {
  const symbols = tokenizeAutomatonInput(automaton, input);
  let current = automaton.type === "nfa"
    ? epsilonClosure(automaton, [automaton.startState])
    : [automaton.startState];
  const path: string[][] = [current];
  for (const symbol of symbols) {
    const matching = automaton.transitions.filter(
      (transition) =>
        current.includes(transition.from) &&
        transition.symbols.some((candidate) => candidate === symbol),
    );
    current = automaton.type === "nfa"
      ? epsilonClosure(automaton, unique(matching.map((transition) => transition.to)))
      : unique(matching.map((transition) => transition.to));
    path.push(current);
  }
  return { symbols, path };
}

export function satisfyAutomatonGoal(
  automaton: Automaton,
  goal: { type: "accept" | "reject"; inputs: string[] },
): EngineResult<{
  automaton: Automaton;
  changes: GoalChange[];
  verification: Array<{ input: string; result: "accepted" | "rejected"; execution: AutomatonExecution }>;
}> {
  let draft = structuredClone(automaton);
  const changes: GoalChange[] = [];

  if (draft.states.length === 0) {
    draft.states.push({ id: "q0", label: "q0" });
    draft.startState = "q0";
    changes.push({
      operation: "add_state",
      description: "Added q0 as the start state so the goal can be evaluated.",
    });
  } else if (!draft.states.some((state) => state.id === draft.startState)) {
    draft.startState = draft.states[0].id;
    changes.push({
      operation: "set_start_state",
      description: `Set ${draft.startState} as the start state.`,
    });
  }
  draft = normaliseAutomaton(draft);

  for (const input of goal.inputs) {
    let execution = executeAutomaton(draft, input);
    if (execution.status === "error") {
      const unknown = tokenizeAutomatonInput(draft, input).filter(
        (symbol) => !draft.alphabet.includes(symbol),
      );
      for (const symbol of unique(unknown)) {
        draft.alphabet.push(symbol);
        changes.push({ operation: "add_symbol", description: `Added "${symbol}" to the alphabet.` });
      }
      execution = executeAutomaton(draft, input);
    }
    if (execution.result === goal.type + "ed") continue;

    if (goal.type === "reject") {
      for (const stateId of execution.currentStates) {
        if (!draft.acceptStates.includes(stateId)) continue;
        draft.acceptStates = draft.acceptStates.filter((id) => id !== stateId);
        changes.push({
          operation: "remove_accept_state",
          description: `Made ${stateId} non-accepting so "${input}" is rejected.`,
        });
      }
      draft = normaliseAutomaton(draft);
      continue;
    }

    const { symbols, path } = tracePath(draft, input);
    let current = path[0]?.[0] ?? draft.startState;
    for (let index = 0; index < symbols.length; index++) {
      const symbol = symbols[index];
      if (!draft.alphabet.includes(symbol)) {
        draft.alphabet.push(symbol);
        changes.push({ operation: "add_symbol", description: `Added "${symbol}" to the alphabet.` });
      }
      const existing = draft.transitions.find(
        (transition) => transition.from === current && transition.symbols.includes(symbol),
      );
      if (existing) {
        current = existing.to;
        continue;
      }
      const stateId = nextId(draft.states.map((state) => state.id), "q");
      draft.states.push({ id: stateId, label: stateId });
      const transitionId = nextId(draft.transitions.map((transition) => transition.id), "t");
      draft.transitions.push({
        id: transitionId,
        from: current,
        to: stateId,
        symbols: [symbol],
      });
      changes.push({
        operation: "add_state_and_transition",
        description: `Added ${current} --${symbol}--> ${stateId}.`,
      });
      current = stateId;
    }
    if (!draft.acceptStates.includes(current)) {
      draft.acceptStates.push(current);
      changes.push({
        operation: "set_accept_state",
        description: `Made ${current} accepting so "${input}" is accepted.`,
      });
    }
    draft = normaliseAutomaton(draft);
  }

  const validation = validateAutomaton(draft);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: "INVALID_AUTOMATON",
        message: "The proposed goal change would make the automaton invalid.",
        details: { validationIssues: validation.issues },
      },
    };
  }
  const verification = goal.inputs.map((input) => {
    const execution = executeAutomaton(draft, input);
    return {
      input,
      result: execution.result === "accepted" ? "accepted" as const : "rejected" as const,
      execution,
    };
  });
  if (verification.some((item) => item.result !== `${goal.type}ed`)) {
    return {
      success: false,
      error: {
        code: "GOAL_UNSATISFIED",
        message: "No valid minimal change was found for every requested input.",
        details: { verification },
      },
    };
  }
  return { success: true, value: { automaton: draft, changes, verification } };
}
