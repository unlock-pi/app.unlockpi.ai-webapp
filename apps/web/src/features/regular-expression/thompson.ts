import {
  normaliseAutomaton,
  validateAutomaton,
  type Automaton,
  type AutomatonState,
  type AutomatonTransition,
  type AutomatonValidationIssue,
} from "@/packages/blocks/automata/model";
import {
  collectAlphabet,
  validateAst,
  type AstValidationIssue,
  type RegularExpressionAst,
} from "@/features/regular-expression/model";

export type ThompsonOperation = Exclude<RegularExpressionAst["type"], "group">;

export type ThompsonNodeMapping = {
  astNodeId: string;
  startStateId: string;
  acceptStateId: string;
  stateIds: string[];
  transitionIds: string[];
};

export type ThompsonConstructionStep = {
  step: number;
  id: string;
  astNodeId: string;
  operation: ThompsonOperation;
  description: string;
  fragment: ThompsonNodeMapping;
  createdStateIds: string[];
  createdTransitionIds: string[];
  highlightedStateIds: string[];
  highlightedTransitionIds: string[];
};

export type ThompsonConstruction = {
  automaton: Automaton;
  trace: ThompsonConstructionStep[];
  nodeMappings: Record<string, ThompsonNodeMapping>;
};

export type ThompsonConstructionError = {
  code: "INVALID_AST" | "INVALID_AUTOMATON";
  message: string;
  astErrors?: AstValidationIssue[];
  automatonErrors?: AutomatonValidationIssue[];
};

export type ThompsonConstructionResult =
  | { success: true; value: ThompsonConstruction }
  | { success: false; error: ThompsonConstructionError };

type Fragment = {
  startStateId: string;
  acceptStateId: string;
  stateIds: string[];
  transitionIds: string[];
};

class ThompsonBuilder {
  readonly states: AutomatonState[] = [];
  readonly transitions: AutomatonTransition[] = [];
  readonly trace: ThompsonConstructionStep[] = [];
  readonly nodeMappings: Record<string, ThompsonNodeMapping> = {};

  private stateNumber = 0;
  private transitionNumber = 0;

  private createState() {
    const id = `q${this.stateNumber++}`;
    this.states.push({ id, label: id });
    return id;
  }

  private createTransition(from: string, to: string, symbol: string) {
    const id = `t${this.transitionNumber++}`;
    this.transitions.push({ id, from, to, symbols: [symbol] });
    return id;
  }

  private mapNode(node: RegularExpressionAst, fragment: Fragment) {
    const mapping: ThompsonNodeMapping = {
      astNodeId: node.id,
      startStateId: fragment.startStateId,
      acceptStateId: fragment.acceptStateId,
      stateIds: [...fragment.stateIds],
      transitionIds: [...fragment.transitionIds],
    };
    this.nodeMappings[node.id] = mapping;
    return mapping;
  }

  private record(
    node: RegularExpressionAst,
    operation: ThompsonOperation,
    description: string,
    fragment: Fragment,
    createdStateIds: string[],
    createdTransitionIds: string[],
  ) {
    const mapping = this.mapNode(node, fragment);
    this.trace.push({
      step: this.trace.length + 1,
      id: `thompson:${node.id}`,
      astNodeId: node.id,
      operation,
      description,
      fragment: mapping,
      createdStateIds,
      createdTransitionIds,
      highlightedStateIds: [fragment.startStateId, fragment.acceptStateId],
      highlightedTransitionIds: createdTransitionIds,
    });
  }

  build(node: RegularExpressionAst): Fragment {
    switch (node.type) {
      case "literal": {
        const startStateId = this.createState();
        const acceptStateId = this.createState();
        const transitionId = this.createTransition(startStateId, acceptStateId, node.value);
        const fragment = {
          startStateId,
          acceptStateId,
          stateIds: [startStateId, acceptStateId],
          transitionIds: [transitionId],
        };
        this.record(
          node,
          "literal",
          `Create a fragment for literal ${node.value}.`,
          fragment,
          fragment.stateIds,
          fragment.transitionIds,
        );
        return fragment;
      }

      case "epsilon": {
        const startStateId = this.createState();
        const acceptStateId = this.createState();
        const transitionId = this.createTransition(startStateId, acceptStateId, "ε");
        const fragment = {
          startStateId,
          acceptStateId,
          stateIds: [startStateId, acceptStateId],
          transitionIds: [transitionId],
        };
        this.record(
          node,
          "epsilon",
          "Create a fragment connected by an epsilon transition.",
          fragment,
          fragment.stateIds,
          fragment.transitionIds,
        );
        return fragment;
      }

      case "empty-set": {
        const startStateId = this.createState();
        const acceptStateId = this.createState();
        const fragment = {
          startStateId,
          acceptStateId,
          stateIds: [startStateId, acceptStateId],
          transitionIds: [],
        };
        this.record(
          node,
          "empty-set",
          "Create disconnected start and accept states, leaving no accepting path.",
          fragment,
          fragment.stateIds,
          [],
        );
        return fragment;
      }

      case "group": {
        const fragment = this.build(node.expression);
        this.mapNode(node, fragment);
        return fragment;
      }

      case "concatenation": {
        const left = this.build(node.left);
        const right = this.build(node.right);
        const connector = this.createTransition(left.acceptStateId, right.startStateId, "ε");
        const fragment = {
          startStateId: left.startStateId,
          acceptStateId: right.acceptStateId,
          stateIds: [...left.stateIds, ...right.stateIds],
          transitionIds: [...left.transitionIds, ...right.transitionIds, connector],
        };
        this.record(
          node,
          "concatenation",
          "Connect the left fragment to the right fragment with epsilon.",
          fragment,
          [],
          [connector],
        );
        return fragment;
      }

      case "union": {
        const left = this.build(node.left);
        const right = this.build(node.right);
        const startStateId = this.createState();
        const acceptStateId = this.createState();
        const connectors = [
          this.createTransition(startStateId, left.startStateId, "ε"),
          this.createTransition(startStateId, right.startStateId, "ε"),
          this.createTransition(left.acceptStateId, acceptStateId, "ε"),
          this.createTransition(right.acceptStateId, acceptStateId, "ε"),
        ];
        const fragment = {
          startStateId,
          acceptStateId,
          stateIds: [startStateId, ...left.stateIds, ...right.stateIds, acceptStateId],
          transitionIds: [...left.transitionIds, ...right.transitionIds, ...connectors],
        };
        this.record(
          node,
          "union",
          "Add a new start and accept state with epsilon paths through both alternatives.",
          fragment,
          [startStateId, acceptStateId],
          connectors,
        );
        return fragment;
      }

      case "kleene-star": {
        const inner = this.build(node.expression);
        const startStateId = this.createState();
        const acceptStateId = this.createState();
        const connectors = [
          this.createTransition(startStateId, inner.startStateId, "ε"),
          this.createTransition(startStateId, acceptStateId, "ε"),
          this.createTransition(inner.acceptStateId, inner.startStateId, "ε"),
          this.createTransition(inner.acceptStateId, acceptStateId, "ε"),
        ];
        const fragment = {
          startStateId,
          acceptStateId,
          stateIds: [startStateId, ...inner.stateIds, acceptStateId],
          transitionIds: [...inner.transitionIds, ...connectors],
        };
        this.record(
          node,
          "kleene-star",
          "Add epsilon paths for zero repetitions, entry, repetition, and exit.",
          fragment,
          [startStateId, acceptStateId],
          connectors,
        );
        return fragment;
      }
    }
  }
}

/** Validates an AST and builds a deterministic epsilon-NFA in the shared automata model. */
export function constructEpsilonNFA(
  root: RegularExpressionAst,
  automatonId = "regex-nfa",
): ThompsonConstructionResult {
  let astValidation;
  try {
    astValidation = validateAst(root);
  } catch {
    const malformed: AstValidationIssue = {
      code: "INVALID_CHILD",
      message: "The regular-expression AST is malformed.",
    };
    return {
      success: false,
      error: {
        code: "INVALID_AST",
        message: malformed.message,
        astErrors: [malformed],
      },
    };
  }
  if (!astValidation.valid) {
    return {
      success: false,
      error: {
        code: "INVALID_AST",
        message: astValidation.errors[0]?.message ?? "The regular-expression AST is invalid.",
        astErrors: astValidation.errors,
      },
    };
  }

  const builder = new ThompsonBuilder();
  const fragment = builder.build(root);
  const automaton = normaliseAutomaton({
    id: automatonId,
    type: "nfa",
    alphabet: collectAlphabet(root),
    states: builder.states,
    transitions: builder.transitions,
    startState: fragment.startStateId,
    acceptStates: [fragment.acceptStateId],
  });
  const automatonValidation = validateAutomaton(automaton);
  if (!automatonValidation.valid) {
    return {
      success: false,
      error: {
        code: "INVALID_AUTOMATON",
        message: automatonValidation.issues[0]?.message ?? "Thompson construction produced an invalid automaton.",
        automatonErrors: automatonValidation.issues,
      },
    };
  }

  return {
    success: true,
    value: {
      automaton,
      trace: builder.trace,
      nodeMappings: builder.nodeMappings,
    },
  };
}
