import type { RegularExpressionBlockProps } from "@/components/regular-expression/types";

const displayModes = new Set(["expression", "tree", "construction"]);

/** Keeps authored RE data serializable and separate from transient visual playback. */
export function reconcileRegularExpressionProps(props: RegularExpressionBlockProps, previous?: RegularExpressionBlockProps | null): RegularExpressionBlockProps {
  const segmentIds = new Set<string>();
  const expressionSegments = (props.expressionSegments ?? []).filter((segment) => { const id = segment.id.trim(); if (!id || !segment.text || segmentIds.has(id)) return false; segmentIds.add(id); return true; }).map((segment) => ({ ...segment, id: segment.id.trim() }));
  const tree = props.syntaxTree?.nodes?.length && props.syntaxTree.rootId ? props.syntaxTree : null;
  const stepIds = new Set<string>();
  const constructionSteps = (props.constructionSteps ?? []).filter((step) => { const id = step.id.trim(); if (!id || stepIds.has(id)) return false; stepIds.add(id); return true; }).map((step) => ({ ...step, id: step.id.trim() }));
  return {
    ...props,
    expression: props.expression ?? "",
    input: props.input ?? "",
    displayMode: displayModes.has(props.displayMode ?? "") ? props.displayMode : previous?.displayMode ?? "expression",
    expressionSegments,
    syntaxTree: tree,
    constructionSteps,
    showSyntaxTree: props.showSyntaxTree ?? previous?.showSyntaxTree ?? true,
    showConstruction: props.showConstruction ?? previous?.showConstruction ?? true,
    showInput: props.showInput ?? previous?.showInput ?? true,
    showExecutionControls: props.showExecutionControls ?? previous?.showExecutionControls ?? true,
  };
}
