import { describe, expect, test } from "bun:test";
import { visibleDerivationNodes } from "./derivation-playback";
import { DEFAULT_CFG_DERIVATION, DEFAULT_CFG_TREE } from "./context-free-grammar";
import { deriveString } from "@/features/context-free-grammar/grammar-engine";
import { DEFAULT_CFG_PROPS } from "./context-free-grammar";

describe("CFG branch-by-branch presentation", () => {
  test("starts at the root and reveals all siblings from a production together", () => {
    expect(visibleDerivationNodes(DEFAULT_CFG_TREE, DEFAULT_CFG_DERIVATION, 0)).toEqual(["s0"]);
    expect(visibleDerivationNodes(DEFAULT_CFG_TREE, DEFAULT_CFG_DERIVATION, 1)).toEqual(["s0", "a0", "s1", "b0"]);
    const second = visibleDerivationNodes(DEFAULT_CFG_TREE, DEFAULT_CFG_DERIVATION, 2);
    expect(second.includes("s2")).toBe(true);
    expect(second.includes("epsilon")).toBe(false);
    expect(visibleDerivationNodes(DEFAULT_CFG_TREE, DEFAULT_CFG_DERIVATION, 3).includes("epsilon")).toBe(true);
  });

  test("uses generated derivation IDs and reveals the complete tree at completion", () => {
    const result = deriveString(DEFAULT_CFG_PROPS.grammar, "aaabbb");
    expect(result.success).toBe(true);
    if (!result.success) return;
    const { parseTree, steps } = result.value;
    expect(visibleDerivationNodes(parseTree, steps, 0)).toEqual([parseTree.rootId]);
    expect(visibleDerivationNodes(parseTree, steps, steps.length - 1).sort()).toEqual(parseTree.nodes.map((node) => node.id).sort());
    // Reset hides descendants without deleting or regenerating the domain tree.
    expect(visibleDerivationNodes(parseTree, steps, 0)).toHaveLength(1);
  });

  test("preserves standalone supplied trees with no derivation", () => {
    expect(visibleDerivationNodes(DEFAULT_CFG_TREE, [], 0)).toHaveLength(DEFAULT_CFG_TREE.nodes.length);
  });
});
