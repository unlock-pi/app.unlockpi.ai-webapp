import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DEFAULT_CONSTRUCTION_STEPS,
  DEFAULT_EXPRESSION_SEGMENTS,
  DEFAULT_SYNTAX_TREE,
  RegularExpressionBlock,
} from "@/components/regular-expression/regular-expression";
import type { RegularExpressionBlockProps } from "@/components/regular-expression/types";
import { RegularExpressionAgentViewProvider } from "@/components/regular-expression/agent-view-context";
import { createAutomatonExecution } from "@/components/automata/model";
import { TransitionDiagram } from "@/components/automata/transition-diagram";
import { convertNfaToDfa } from "@/features/automata-agent/lib/subset-construction";
import { parseRegularExpression } from "@/features/regular-expression/parser";
import { constructEpsilonNFA } from "@/features/regular-expression/thompson";

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
    const parsed = parseRegularExpression(props.expression);
    if (!parsed.ok) throw new Error("Expected valid expression");
    const construction = constructEpsilonNFA(parsed.value.root);
    if (!construction.success) throw new Error("Expected ε-NFA");
    const automaton = construction.value.automaton;
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

  test("shows only the selected DFA while retaining its source NFA internally", () => {
    const parsed = parseRegularExpression(props.expression);
    if (!parsed.ok) throw new Error("Expected valid expression");
    const construction = constructEpsilonNFA(parsed.value.root);
    if (!construction.success) throw new Error("Expected ε-NFA");
    const source = construction.value.automaton;
    const conversion = convertNfaToDfa(source);
    if (!conversion.success) throw new Error("Expected DFA");
    const dfa = conversion.value.automaton;

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

  test("shows only the ε-NFA when Thompson playback is selected after DFA conversion", () => {
    const parsed = parseRegularExpression(props.expression);
    if (!parsed.ok) throw new Error("Expected valid expression");
    const construction = constructEpsilonNFA(parsed.value.root);
    if (!construction.success) throw new Error("Expected ε-NFA");
    const source = construction.value.automaton;
    const conversion = convertNfaToDfa(source);
    if (!conversion.success) throw new Error("Expected DFA");
    const html = renderToStaticMarkup(
      <RegularExpressionAgentViewProvider blockId={props.id} state={{
        generatedAutomaton: source, sourceAutomaton: source,
        generatedDfa: conversion.value.automaton,
      }}>
        <RegularExpressionBlock {...props} />
      </RegularExpressionAgentViewProvider>,
    );
    expect(html.includes('aria-label="Generated automaton"')).toBe(true);
    expect(html.includes('aria-label="Generated DFA"')).toBe(false);
  });

  test("uses compact graph spacing only for embedded diagrams", () => {
    const parsed = parseRegularExpression("a");
    if (!parsed.ok) throw new Error("Expected valid expression");
    const construction = constructEpsilonNFA(parsed.value.root);
    if (!construction.success) throw new Error("Expected ε-NFA");
    const automaton = construction.value.automaton;
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
