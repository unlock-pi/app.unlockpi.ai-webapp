import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DEFAULT_CONSTRUCTION_STEPS,
  DEFAULT_EXPRESSION_SEGMENTS,
  DEFAULT_SYNTAX_TREE,
  RegularExpressionBlock,
} from "./regular-expression";
import type { RegularExpressionBlockProps } from "./types";
import { RegularExpressionAgentViewProvider } from "./agent-view-context";
import { createAutomatonExecution, type Automaton } from "@unlockpi/blocks/automata";
import { TransitionDiagram } from "@unlockpi/blocks/automata";
import type { AutomataConstructionView } from "@unlockpi/blocks/automata";

const nfa: Automaton = {
  id: "regex-nfa",
  type: "nfa",
  alphabet: ["a"],
  states: [{ id: "q0", label: "q0" }, { id: "q1", label: "q1" }],
  transitions: [{ id: "t0", from: "q0", to: "q1", symbols: ["a"] }],
  startState: "q0",
  acceptStates: ["q1"],
};

const dfa: Automaton = { ...nfa, id: "regex-dfa", type: "dfa" };

function constructionFrame(
  automaton: Automaton,
  mode: "paused" | "building",
): AutomataConstructionView {
  return {
    automatonId: automaton.id,
    timeline: {
      mode,
      steps: [{ action: { type: "create_state", stateId: automaton.startState } }],
      currentStep: 0,
      token: mode === "building" ? "first" : null,
      animation: mode === "building" ? "running" : "idle",
    },
    visibleStates: mode === "building" ? [automaton.startState] : [],
    visibleTransitions: [],
    initialState: null,
    acceptingStates: [],
    highlightedStates: mode === "building" ? [automaton.startState] : [],
    highlightedTransitions: [],
  };
}

const props: RegularExpressionBlockProps & { id: string } = {
  id: "re-layout-test",
  expression: "(a|b)*abb",
  input: "aabb",
  displayMode: "expression",
  expressionSegments: DEFAULT_EXPRESSION_SEGMENTS,
  syntaxTree: DEFAULT_SYNTAX_TREE,
  constructionSteps: DEFAULT_CONSTRUCTION_STEPS,
  showSyntaxTree: true,
  showConstruction: true,
  showInput: true,
  showExecutionControls: true,
};

describe("regular expression single-frame layout", () => {
  test("starts with the expression and tree but no generated automata", () => {
    const html = renderToStaticMarkup(<RegularExpressionBlock {...props} />);

    expect(html.includes("Regular expression")).toBe(true);
    expect(html.includes('aria-label="Syntax tree"')).toBe(true);
    expect(html.includes('aria-label="Generated automaton"')).toBe(false);
    expect(html.includes('aria-label="Generated DFA"')).toBe(false);
    expect(html.includes("ε-NFA")).toBe(false);
    expect(html.includes("Input")).toBe(true);
    expect(html.includes("Step")).toBe(true);
    expect(html.includes("Reset")).toBe(true);
    expect(html.includes("Regular expression views")).toBe(false);
    expect(html.includes("AST nodes")).toBe(false);
    expect(html.includes("Introduce a fragment")).toBe(false);
  });

  test("shows an ε-NFA only after construction", () => {
    const automaton = nfa;
    const html = renderToStaticMarkup(
      <RegularExpressionAgentViewProvider
        blockId={props.id}
        state={{
          sourceAutomaton: automaton,
          generatedAutomaton: automaton,
          generatedAutomatonExecution: createAutomatonExecution(automaton),
        }}
      >
        <RegularExpressionBlock {...props} />
      </RegularExpressionAgentViewProvider>,
    );

    expect(html.includes('aria-label="Generated automaton"')).toBe(true);
    expect(html.includes('aria-label="Generated DFA"')).toBe(false);
  });

  test("keeps a new RE graph empty until its first drawing step", () => {
    const automaton = nfa;
    const waitingFrame = constructionFrame(automaton, "paused");
    const html = renderToStaticMarkup(
      <RegularExpressionAgentViewProvider blockId={props.id} state={{
        generatedAutomaton: automaton,
        generatedAutomatonExecution: createAutomatonExecution(automaton),
      }} automatonConstruction={waitingFrame}>
        <RegularExpressionBlock {...props} />
      </RegularExpressionAgentViewProvider>,
    );
    const diagram = html.split('aria-label="NFA state diagram"')[1]?.split("</svg>")[0] ?? "";
    expect(diagram.includes("<circle")).toBe(false);
    expect(diagram.includes("<polygon")).toBe(false);
  });

  test("uses the shared construction view to reveal only the first RE automaton state", () => {
    const automaton = nfa;
    const firstFrame = constructionFrame(automaton, "building");
    const html = renderToStaticMarkup(
      <RegularExpressionAgentViewProvider blockId={props.id} state={{
        generatedAutomaton: automaton,
        generatedAutomatonExecution: createAutomatonExecution(automaton),
      }} automatonConstruction={firstFrame}>
        <RegularExpressionBlock {...props} />
      </RegularExpressionAgentViewProvider>,
    );
    const diagram = html.split('aria-label="NFA state diagram"')[1]?.split("</svg>")[0] ?? "";
    expect(diagram.includes("<circle")).toBe(true);
    expect((diagram.match(/<circle/g) ?? []).length).toBe(1);
    expect(diagram.includes("<polygon")).toBe(false);
  });

  test("shows only the selected DFA while retaining its source NFA internally", () => {
    const source = nfa;

    const html = renderToStaticMarkup(
      <RegularExpressionAgentViewProvider
        blockId={props.id}
        state={{
          sourceAutomaton: source,
          generatedAutomaton: dfa,
          generatedAutomatonExecution: createAutomatonExecution(dfa),
        }}
      >
        <RegularExpressionBlock {...props} />
      </RegularExpressionAgentViewProvider>,
    );

    expect(html.includes('aria-label="Syntax tree"')).toBe(true);
    expect(html.includes('aria-label="Generated automaton"')).toBe(false);
    expect(html.includes('aria-label="Generated DFA"')).toBe(true);
    expect(html.includes("xl:grid-cols-[")).toBe(true);
  });

  test("reveals only the DFA start state during direct conversion playback", () => {
    const firstFrame = constructionFrame(dfa, "building");
    const html = renderToStaticMarkup(
      <RegularExpressionAgentViewProvider blockId={props.id} state={{
        generatedAutomaton: dfa,
        generatedAutomatonExecution: createAutomatonExecution(dfa),
        sourceAutomaton: nfa,
      }} automatonConstruction={firstFrame}>
        <RegularExpressionBlock {...props} />
      </RegularExpressionAgentViewProvider>,
    );
    const diagram = html.split('aria-label="DFA state diagram"')[1]?.split("</svg>")[0] ?? "";
    expect(html.includes('aria-label="Generated DFA"')).toBe(true);
    expect(html.includes('aria-label="Generated automaton"')).toBe(false);
    expect((diagram.match(/<circle/g) ?? []).length).toBe(1);
    expect(diagram.includes("<polygon")).toBe(false);
  });

  test("shows only the ε-NFA when Thompson playback is selected after DFA conversion", () => {
    const source = nfa;
    const html = renderToStaticMarkup(
      <RegularExpressionAgentViewProvider blockId={props.id} state={{
        generatedAutomaton: source, sourceAutomaton: source,
        generatedDfa: dfa,
      }}>
        <RegularExpressionBlock {...props} />
      </RegularExpressionAgentViewProvider>,
    );
    expect(html.includes('aria-label="Generated automaton"')).toBe(true);
    expect(html.includes('aria-label="Generated DFA"')).toBe(false);
  });

  test("uses compact graph spacing only for embedded diagrams", () => {
    const automaton = nfa;
    const execution = createAutomatonExecution(automaton);
    const standalone = renderToStaticMarkup(
      <TransitionDiagram automaton={automaton} execution={execution} />,
    );
    const embedded = renderToStaticMarkup(
      <TransitionDiagram
        automaton={automaton}
        execution={execution}
        compactSpacing
      />,
    );

    expect(standalone.includes('viewBox="0 0 520 340"')).toBe(true);
    expect(embedded.includes('viewBox="0 0 420 340"')).toBe(true);
  });

  test("does not hide visualizations when legacy authored view flags are set", () => {
    const html = renderToStaticMarkup(
      <RegularExpressionBlock
        {...props}
        displayMode="tree"
        showSyntaxTree={false}
        showConstruction={false}
        showInput={false}
        showExecutionControls={false}
      />,
    );

    expect(html.includes('aria-label="Syntax tree"')).toBe(true);
    expect(html.includes('aria-label="Generated automaton"')).toBe(false);
    expect(html.includes("Step")).toBe(true);
    expect(html.includes("Reset")).toBe(true);
  });
});
