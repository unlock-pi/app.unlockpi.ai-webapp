/**
 * Sketch widths, as a percentage of the frame column. Shared so the Draw panel
 * and the block inspector always offer the same set.
 */
export const sketchWidthOptions: Array<{ label: string; value: number }> = [
  { label: "25%", value: 25 },
  { label: "50%", value: 50 },
  { label: "75%", value: 75 },
  { label: "100%", value: 100 },
];

export const DEFAULT_SKETCH_WIDTH_PERCENT = 100;
