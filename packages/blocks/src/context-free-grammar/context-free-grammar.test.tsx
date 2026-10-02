import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ContextFreeGrammarBlock, DEFAULT_CFG_PROPS } from "./index";
import { ContextFreeGrammarAgentViewProvider } from "./agent-view-context";
import { reconcileContextFreeGrammarProps } from "./authoring";
import { ParseTree } from "./parse-tree";

describe("context-free grammar visual block", () => {
  test("shows the compact grammar, derivation, n-ary tree, input, and shared controls", () => {
    const html = renderToStaticMarkup(<ContextFreeGrammarBlock id="cfg-1" {...DEFAULT_CFG_PROPS} />);
    expect(html.includes('aria-label="Grammar productions"')).toBe(true);
    expect(html.includes('aria-label="Derivation"')).toBe(true);
    expect(html.includes('aria-label="Context-free grammar parse tree"')).toBe(true);
    expect(html.includes('data-tree-node="s0"')).toBe(true);
    expect(html.includes('data-tree-edge="s0-a0"')).toBe(false);
    expect(html.includes('data-tree-node="s1"')).toBe(false);
    expect(html.includes("Step")).toBe(true);
    expect(html.includes("Reset")).toBe(true);
    expect(html.includes("Overview")).toBe(false);
  });

  test("renders supplied highlighting without deriving a tree", () => {
    const html = renderToStaticMarkup(
      <ContextFreeGrammarAgentViewProvider blockId="cfg-1" state={{
        currentDerivationStep: 3,
        highlightedProductionIds: ["p1"],
        highlightedSubtreeRootIds: ["s2"],
        activeParseTreeNodeId: "epsilon",
      }}>
        <ContextFreeGrammarBlock id="cfg-1" {...DEFAULT_CFG_PROPS} />
      </ContextFreeGrammarAgentViewProvider>,
    );
    expect(html.includes('data-production-id="p1"')).toBe(true);
    expect(html.includes('data-tree-node="epsilon"')).toBe(true);
    expect(html.includes("aabb")).toBe(true);
  });

  test("supports a parse tree with more than two children", () => {
    const html = renderToStaticMarkup(<ParseTree tree={DEFAULT_CFG_PROPS.parseTree} />);
    expect(html.includes('data-tree-edge="s0-a0"')).toBe(true);
    expect(html.includes('data-tree-edge="s0-s1"')).toBe(true);
    expect(html.includes('data-tree-edge="s0-b0"')).toBe(true);
  });

  test("preserves a newly supplied parse tree when grammar changes in the same update", () => {
    const replacement = { rootId: "root", nodes: [{ id: "root", label: "S" }] };
    const edited = reconcileContextFreeGrammarProps({
      ...DEFAULT_CFG_PROPS,
      grammar: { ...DEFAULT_CFG_PROPS.grammar, productions: [{ id: "p0", lhs: "S", rhs: ["a"] }] },
      parseTree: replacement,
      derivationSteps: [{ id: "fresh", symbols: ["S"] }],
    }, DEFAULT_CFG_PROPS);
    expect(edited.parseTree).toEqual(replacement);
    expect(edited.derivationSteps).toHaveLength(1);
  });

  test("keeps authored data serializable and drops stale visuals when grammar changes", () => {
    const edited = reconcileContextFreeGrammarProps({
      ...DEFAULT_CFG_PROPS,
      grammar: {
        ...DEFAULT_CFG_PROPS.grammar,
        productions: [{ id: "p0", lhs: "S", rhs: ["a"] }],
      },
    }, DEFAULT_CFG_PROPS);
    expect(edited.parseTree).toBe(null);
    expect(edited.derivationSteps).toEqual([]);
    expect(JSON.parse(JSON.stringify(edited)).grammar.productions[0].rhs).toEqual(["a"]);
  });
});
