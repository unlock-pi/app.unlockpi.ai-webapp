import type { DerivationStep, ParseTreeData } from "./types";

export const DERIVATION_ANIMATION_MS = 1_800;

/** Reveal complete production branches, not just their highlighted variable. */
export function visibleDerivationNodes(tree: ParseTreeData, steps: DerivationStep[], currentStep: number, selectedNodeId?: string | null, subtreeRoots: string[] = []): string[] {
  if (!steps.length || !steps.slice(1).some((step) => step.highlightedTreeEdges?.length || step.activeTreeNodeId)) return tree.nodes.map((node) => node.id);
  const nodes = new Map(tree.nodes.map((node) => [node.id, node]));
  const visible = new Set([tree.rootId]);
  for (const step of steps.slice(1, currentStep + 1)) {
    const parents = new Set(step.highlightedTreeEdges?.map((edge) => edge.from) ?? []);
    if (!parents.size && step.activeTreeNodeId) parents.add(step.activeTreeNodeId);
    for (const parent of parents) {
      if (!visible.has(parent)) continue;
      for (const child of nodes.get(parent)?.children ?? []) visible.add(child);
    }
  }
  // Explicit view highlights must remain discoverable, even ahead of playback.
  const parents = new Map<string, string>();
  for (const node of tree.nodes) for (const child of node.children ?? []) parents.set(child, node.id);
  const revealPath = (id: string) => {
    const visited = new Set<string>();
    let cursor: string | undefined = id;
    while (cursor && nodes.has(cursor) && !visited.has(cursor)) {
      visited.add(cursor);
      visible.add(cursor);
      cursor = parents.get(cursor);
    }
  };
  if (selectedNodeId) revealPath(selectedNodeId);
  const descendants = new Set<string>();
  const revealSubtree = (id: string) => {
    if (descendants.has(id) || !nodes.has(id)) return;
    descendants.add(id);
    visible.add(id);
    for (const child of nodes.get(id)?.children ?? []) revealSubtree(child);
  };
  for (const root of subtreeRoots) { revealPath(root); revealSubtree(root); }
  return [...visible];
}
