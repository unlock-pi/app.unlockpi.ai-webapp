import {
  epsilonClosure,
  isEpsilon,
  move,
  normaliseAutomaton,
  validateAutomaton,
  type Automaton,
  type AutomatonTransition,
} from "@/packages/blocks/automata/model";

export type SubsetConstructionStep = {
  step: number;
  sourceDfaStateId: string;
  sourceStateSet: string[];
  symbol: string;
  moveResult: string[];
  epsilonClosure: string[];
  resultingDfaStateId: string;
  resultingStateCreated: boolean;
  createdTransitionId: string;
  traversedNfaTransitionIds: string[];
};

export type SubsetConstruction = {
  sourceAutomatonId: string;
  automaton: Automaton;
  stateSets: Record<string, string[]>;
  trace: SubsetConstructionStep[];
};

export type SubsetConstructionError = {
  code: "INVALID_AUTOMATON" | "NOT_NFA";
  message: string;
  details?: Record<string, unknown>;
};

export type SubsetConstructionResult =
  | { success: true; value: SubsetConstruction }
  | { success: false; error: SubsetConstructionError };

function orderedStateIds(automaton: Automaton, stateIds: Iterable<string>) {
  const order = new Map(
    automaton.states.map((state, index) => [state.id, index]),
  );
  return [...new Set(stateIds)].sort(
    (left, right) =>
      (order.get(left) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right) ?? Number.MAX_SAFE_INTEGER) ||
      left.localeCompare(right),
  );
}

function subsetKey(stateIds: readonly string[]) {
  return JSON.stringify(stateIds);
}

function subsetLabel(stateIds: readonly string[]) {
  return stateIds.length ? `{${stateIds.join(", ")}}` : "∅";
}

/**
 * Deterministic subset construction for an NFA or ε-NFA.
 *
 * The source automaton is never mutated. Empty moves become an explicit dead
 * subset so the resulting DFA is complete for every source alphabet symbol.
 */
export function convertNfaToDfa(
  source: Automaton,
  targetAutomatonId = `${source.id}-dfa`,
): SubsetConstructionResult {
  const validation = validateAutomaton(source);
  if (!validation.valid) {
    return {
      success: false,
      error: {
        code: "INVALID_AUTOMATON",
        message:
          validation.issues[0]?.message ?? "The source automaton is not valid.",
        details: { validationIssues: validation.issues },
      },
    };
  }
  if (source.type !== "nfa") {
    return {
      success: false,
      error: {
        code: "NOT_NFA",
        message: "Subset construction requires an NFA or ε-NFA source.",
        details: { automatonId: source.id, type: source.type },
      },
    };
  }

  const alphabet = source.alphabet.filter((symbol) => !isEpsilon(symbol));
  const initialSet = orderedStateIds(
    source,
    epsilonClosure(source, [source.startState]),
  );
  const subsetIdByKey = new Map<string, string>();
  const stateSets: Record<string, string[]> = {};
  const pending: string[][] = [];
  const states: Automaton["states"] = [];
  const transitions: AutomatonTransition[] = [];
  const trace: SubsetConstructionStep[] = [];

  const ensureSubset = (stateIds: string[]) => {
    const normalized = orderedStateIds(source, stateIds);
    const key = subsetKey(normalized);
    const existing = subsetIdByKey.get(key);
    if (existing) {
      return { id: existing, stateIds: normalized, created: false };
    }

    const id = `d${subsetIdByKey.size}`;
    subsetIdByKey.set(key, id);
    stateSets[id] = normalized;
    states.push({
      id,
      label: subsetLabel(normalized),
      initial: id === "d0",
      accepting: normalized.some((stateId) =>
        source.acceptStates.includes(stateId),
      ),
    });
    pending.push(normalized);
    return { id, stateIds: normalized, created: true };
  };

  const initial = ensureSubset(initialSet);

  while (pending.length) {
    const sourceSet = pending.shift() as string[];
    const sourceDfaStateId = subsetIdByKey.get(subsetKey(sourceSet)) as string;

    for (const symbol of alphabet) {
      const matching = move(source, sourceSet, symbol);
      const moved = orderedStateIds(
        source,
        matching.map((transition) => transition.to),
      );
      const closure = orderedStateIds(source, epsilonClosure(source, moved));
      const target = ensureSubset(closure);
      const transitionId = `dt${transitions.length}`;

      transitions.push({
        id: transitionId,
        from: sourceDfaStateId,
        to: target.id,
        symbols: [symbol],
      });
      trace.push({
        step: trace.length + 1,
        sourceDfaStateId,
        sourceStateSet: [...sourceSet],
        symbol,
        moveResult: moved,
        epsilonClosure: closure,
        resultingDfaStateId: target.id,
        resultingStateCreated: target.created,
        createdTransitionId: transitionId,
        traversedNfaTransitionIds: matching.map((transition) => transition.id),
      });
    }
  }

  const automaton = normaliseAutomaton({
    id: targetAutomatonId,
    type: "dfa",
    alphabet,
    states,
    transitions,
    startState: initial.id,
    acceptStates: states
      .filter((state) => state.accepting)
      .map((state) => state.id),
  });
  const targetValidation = validateAutomaton(automaton);
  if (!targetValidation.valid) {
    return {
      success: false,
      error: {
        code: "INVALID_AUTOMATON",
        message:
          targetValidation.issues[0]?.message ??
          "Subset construction produced an invalid DFA.",
        details: { validationIssues: targetValidation.issues },
      },
    };
  }

  return {
    success: true,
    value: {
      sourceAutomatonId: source.id,
      automaton,
      stateSets,
      trace,
    },
  };
}
