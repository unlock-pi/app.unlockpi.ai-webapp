# Array block

An animated array strip plus the pure operations that produce its teaching steps. It is used by lessons, canvas blocks, and the arrays realtime agent.

## Use it

```tsx
import { ArrayView, insertAtIndex, useArrayPlayer } from "@unlockpi/blocks/array";

function InsertDemo() {
  const result = insertAtIndex(["4", "8", "12"], 1, "6");
  const { frame, controls } = useArrayPlayer();

  return (
    <>
      <button onClick={() => controls.play(result.frames)}>Insert 6</button>
      <ArrayView data={frame?.values ?? result.values} activeIndices={frame?.active} />
    </>
  );
}
```

For a static diagram, pass props directly:

```tsx
<ArrayView data={["10", "20", "30"]} name="A" activeIndex={1} showIndex />
```

## Props

| Prop | Type | Example | Purpose |
| --- | --- | --- | --- |
| `data` | `Array<string \| number>` | `data={["10", "20", "30"]}` | Required array values. |
| `name` | `string` | `name="A"` | Array label shown before the strip. |
| `nameHint` | `string` | `nameHint="sorted"` | Small supporting label below the name. |
| `accessExpression` | `string` | `accessExpression="A[2]"` | Expression shown while explaining direct access. |
| `showIndex` | `boolean` | `showIndex={false}` | Shows or hides the zero-based index row. Defaults to `true`. |
| `activeIndex` | `number` | `activeIndex={2}` | One cell currently in focus. |
| `activeIndices` | `number[]` | `activeIndices={[1, 2]}` | Multiple focused cells, usually a comparison pair. |
| `visitedIndices` | `number[]` | `visitedIndices={[0, 1]}` | Cells already inspected during a search or traversal. |
| `settledIndices` | `number[]` | `settledIndices={[3, 4]}` | Cells in their final sorted position. |
| `foundIndex` | `number` | `foundIndex={2}` | The cell that answers a search or operation. |
| `disabledElements` | `number[]` | `disabledElements={[0]}` | Cells rendered as unavailable. |
| `traversalTarget` | `number` | `traversalTarget={3}` | Target index used by the traversal display. |
| `marker` | `{ index: number; label: string }` | `marker={{ index: 2, label: "pivot" }}` | Labelled pointer below one cell. |
| `caret` | `{ index: number; label?: string }` | `caret={{ index: 1, label: "insert" }}` | Position pointer for insert or delete. Takes precedence over `marker`. |
| `gapIndex` | `number` | `gapIndex={2}` | Draws an empty slot so adjacent values animate around it. |
| `held` | `{ value: string; label: string }` | `held={{ value: "20", label: "held" }}` | Value temporarily lifted above the strip during a sorting step. |
| `dimElements` | `boolean` | `dimElements` | Dims all cell values. |
| `dimIndices` | `boolean` | `dimIndices` | Dims the index row. |
| `highlightElements` | `boolean` | `highlightElements` | Highlights all cell values. |
| `highlightIndices` | `boolean` | `highlightIndices` | Highlights the index row. |
| `className` | `string` | `className="max-w-xl"` | Additional layout or styling classes. |

## How it works

Operations return an `ArrayOpResult`: final `values`, explanatory `frames`, a `summary`, and optional complexity metadata. Each `ArrayFrame` is a full snapshot, so a player can move through it without reconstructing history.

Use the exported operations (`insertAtIndex`, `bubbleSort`, `linearSearch`, `analyzeArray`, and so on) instead of creating ad hoc animation states. The maximum visible length is `MAX_ARRAY_LENGTH` (currently 10).

## When changing it

- Keep operations pure: no React, browser, network, or canvas-document access.
- Add new animation vocabulary to `ArrayFrame` only when it is reusable across operations.
- Export public additions from `index.ts`; consumers should never import `lib/*` directly.
