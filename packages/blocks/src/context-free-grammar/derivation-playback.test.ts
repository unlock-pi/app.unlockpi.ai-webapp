import { describe, expect, test } from "bun:test";
import { visibleDerivationNodes } from "./derivation-playback";
import { DEFAULT_CFG_DERIVATION, DEFAULT_CFG_TREE } from "./context-free-grammar";

describe("CFG branch-by-branch presentation", () => {
  test("starts at the root and reveals all siblings from a production together", () => {
    expect(visibleDerivationNodes(DEFAULT_CFG_TREE, DEFAULT_CFG_DERIVATION, 0)).toEqual(["s0"]);
    expect(visibleDerivationNodes(DEFAULT_CFG_TREE, DEFAULT_CFG_DERIVATION, 1)).toEqual(["s0", "a0", "s1", "b0"]);
    const second = visibleDerivationNodes(DEFAULT_CFG_TREE, DEFAULT_CFG_DERIVATION, 2);
    expect(second.includes("s2")).toBe(true);
    expect(second.includes("epsilon")).toBe(false);
    expect(visibleDerivationNodes(DEFAULT_CFG_TREE, DEFAULT_CFG_DERIVATION, 3).includes("epsilon")).toBe(true);
  });

  test("preserves standalone supplied trees with no derivation", () => {
    expect(visibleDerivationNodes(DEFAULT_CFG_TREE, [], 0)).toHaveLength(DEFAULT_CFG_TREE.nodes.length);
  });
});
