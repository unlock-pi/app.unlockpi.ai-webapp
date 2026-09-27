/**
 * The array module's public API. Anything outside this folder imports from
 * here — `@unlockpi/blocks/array` — never from a file inside it directly.
 *
 * This is the whole concept, not just its rendering: the animation contract
 * (`array-frame.ts`), the shared vocabulary every operation returns
 * (`array-types.ts`), operation-level helpers and the complexity table
 * (`array-helpers.ts`), every operation itself — structural, sorting,
 * search, combine, analysis, code generation, naming — and the player hook.
 * A consumer needing "everything about arrays" gets it from one import, not
 * scattered across a package and an app feature folder — see the package
 * README's "one purpose per concept" reasoning for why.
 *
 * The larger operation files (`array-ops.ts` and friends) are re-exported
 * with `export *` rather than a hand-enumerated list: each already owns one
 * category with no name overlap between them, and a manual list would just
 * go stale the moment a new operation is added.
 */
export { ArrayView } from "./array-view";
export type { ArrayViewProps } from "./array-view";

export {
  frame,
  MAX_ARRAY_LENGTH,
  MAX_VALUE_DISPLAY_CHARS,
  truncateValue,
} from "./array-frame";
export type { ArrayFrame, ArrayValue } from "./array-frame";

export type {
  AnimationSpeed,
  ArrayOpResult,
  Complexity,
  SortAlgorithm,
  SortOptions,
  SortOrder,
  SortResult,
  SortStep,
  SortStepKind,
} from "./array-types";

export * from "./array-helpers";
export * from "./array-ops";
export * from "./array-sorting";
export * from "./array-search";
export * from "./array-combine";
export * from "./array-analysis";
export * from "./array-code";
export * from "./array-name";
export * from "./operation-code";
export * from "./use-array-player";
