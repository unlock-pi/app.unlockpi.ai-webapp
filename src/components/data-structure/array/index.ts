/**
 * The array module's public API. Anything outside this folder imports from
 * here — `@/components/data-structure/array` — never from a file inside it
 * directly.
 */
export { ArrayView } from "@/components/data-structure/array/array-view";
export type { ArrayViewProps } from "@/components/data-structure/array/array-view";

export {
  frame,
  MAX_ARRAY_LENGTH,
  MAX_VALUE_DISPLAY_CHARS,
  truncateValue,
} from "@/components/data-structure/array/array-frame";
export type { ArrayFrame, ArrayValue } from "@/components/data-structure/array/array-frame";
