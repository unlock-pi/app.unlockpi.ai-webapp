/**
 * All the knobs for /visuals live here.
 *
 * This is deliberately plain data — no abstraction, no factories. If you want
 * to add a style, change a model, or add an aspect ratio, you edit this file
 * and nothing else.
 */

import {
  GemIcon,
  ImageIcon,
  LayersIcon,
  PencilRulerIcon,
  ShapesIcon,
  SparklesIcon,
  SquareIcon,
  WandIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";

/** The two quality tiers shown in the UI. Users never see raw model ids. */
export const IMAGE_MODELS = {
  standard: {
    label: "Standard",
    hint: "Fast, good detail",
    icon: ZapIcon,
    /** Swap to "gpt-image-1.5" or "gpt-image-2" when you want newer models. */
    model: "gpt-image-1-mini",
    quality: "medium",
  },
  pro: {
    label: "Pro",
    hint: "Max detail, sharp labels",
    icon: GemIcon,
    model: "gpt-image-1",
    quality: "high",
  },
} as const;

export type ImageModelTier = keyof typeof IMAGE_MODELS;

/**
 * Rough per-image cost estimates in USD, used only to populate `cost_usd` on
 * each row for later spend analysis in the admin panel.
 *
 * These are PLACEHOLDER figures, not billing-accurate numbers — update them
 * against the real per-image price at https://platform.openai.com/docs/pricing
 * before treating this as anything more than a directional signal.
 */
export const ESTIMATED_IMAGE_COST_USD: Record<ImageModelTier, number> = {
  standard: 0.02,
  pro: 0.07,
};

/** Flat placeholder estimate for a Mermaid generation (one gpt-4o call). */
export const ESTIMATED_MERMAID_COST_USD = 0.01;

/**
 * OpenAI's image models only accept three sizes: 1024x1024, 1536x1024 and
 * 1024x1536. We expose four familiar ratios and map them to the nearest
 * supported size — 4:3 and 16:9 both land on the same landscape canvas.
 * If OpenAI adds true widescreen, just change the `size` value below.
 *
 * `box` describes the preview rectangle drawn in the picker, as a width:height
 * ratio scaled to fit inside a small fixed box — purely visual.
 */
export const ASPECT_RATIOS = {
  "1:1": { label: "Square", hint: "1:1", size: "1024x1024", box: { w: 22, h: 22 } },
  "4:3": { label: "Landscape", hint: "4:3", size: "1536x1024", box: { w: 26, h: 20 } },
  "16:9": { label: "Wide", hint: "16:9", size: "1536x1024", box: { w: 28, h: 16 } },
  "9:16": { label: "Portrait", hint: "9:16", size: "1024x1536", box: { w: 16, h: 28 } },
} as const;

export type AspectRatioKey = keyof typeof ASPECT_RATIOS;

/**
 * Style presets. `promptFragment` is appended to the user's description before
 * it reaches the model — that's what actually controls the look.
 */
export const VISUAL_STYLES = [
  {
    id: "auto",
    label: "Auto",
    description: "Let AI choose",
    icon: WandIcon,
    // Empty on purpose — buildImagePrompt asks the model to pick instead.
    promptFragment: "",
  },
  {
    id: "technical-diagram",
    label: "Technical",
    description: "Clean labelled schematic",
    icon: PencilRulerIcon,
    promptFragment:
      "a clean technical schematic diagram, precise line work, clearly labelled parts with callout lines, flat muted colours, white background, textbook illustration quality",
  },
  {
    id: "cutaway",
    label: "Cross-section",
    description: "Cutaway internals",
    icon: LayersIcon,
    promptFragment:
      "a detailed cross-section cutaway illustration revealing internal components, subtle shading, labelled parts, engineering textbook style, white background",
  },
  {
    id: "blueprint",
    label: "Blueprint",
    description: "White-on-blue draft",
    icon: SquareIcon,
    promptFragment:
      "a blueprint-style technical drawing, white line work on deep blue background, measured and precise, drafting annotations",
  },
  {
    id: "isometric",
    label: "Isometric",
    description: "3D-ish overview",
    icon: ShapesIcon,
    promptFragment:
      "a clean isometric 3D illustration, soft even lighting, flat pastel palette, minimal shadows, white background, modern infographic style",
  },
  {
    id: "chalkboard",
    label: "Chalkboard",
    description: "Hand-drawn teaching",
    icon: PencilRulerIcon,
    promptFragment:
      "a hand-drawn chalkboard sketch, white and pastel chalk on dark slate, friendly classroom teaching style, clear handwritten labels",
  },
  {
    id: "minimal-flat",
    label: "Minimal flat",
    description: "Simple flat vector",
    icon: SparklesIcon,
    promptFragment:
      "a minimal flat vector illustration, bold simple shapes, limited two-tone colour palette, generous whitespace, no gradients",
  },
] as const satisfies {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  promptFragment: string;
}[];

export type VisualStyleId = (typeof VISUAL_STYLES)[number]["id"];

/** How many images a single generation can produce. */
export const IMAGE_COUNTS = [1, 2, 3, 4] as const;

/** Starter prompts shown above the input. Edit freely. */
export const VISUAL_SUGGESTIONS = {
  image: [
    { text: "Labelled cutaway of a two-stroke engine", icon: LayersIcon },
    { text: "The water cycle with labelled stages", icon: SparklesIcon },
    { text: "Cross-section of a plant cell", icon: ShapesIcon },
    { text: "How a solar panel converts light to electricity", icon: ZapIcon },
    { text: "Parts of the human eye, labelled", icon: PencilRulerIcon },
  ],
  mermaid: [
    { text: "How a compiler turns source code into an executable", icon: LayersIcon },
    { text: "The HTTP request lifecycle", icon: SparklesIcon },
    { text: "States of matter and the transitions between them", icon: ShapesIcon },
    { text: "How binary search narrows a sorted array", icon: ZapIcon },
    { text: "Database schema for a school library", icon: PencilRulerIcon },
  ],
} as const;

/** Placeholder phrases cycled by the animated textarea placeholder. */
export const PLACEHOLDER_EXAMPLES = {
  image: [
    "A labelled cutaway of a two-stroke engine...",
    "Cross-section of a plant cell, labelled...",
    "How a jet engine works, step by step...",
    "The structure of a human heart...",
  ],
  mermaid: [
    "How a compiler turns source code into an executable...",
    "The HTTP request lifecycle...",
    "How binary search narrows a sorted array...",
    "Database schema for a school library...",
  ],
} as const;

/** Icon shown in the hero's morphing shape, cycled in order. Swap freely. */
export const HERO_MORPH_ICONS: LucideIcon[] = [ImageIcon, ShapesIcon, SparklesIcon];

/** Builds the final prompt sent to the image model. */
export function buildImagePrompt(
  description: string,
  styleId: VisualStyleId,
): string {
  const style = VISUAL_STYLES.find((entry) => entry.id === styleId);
  return [
    description.trim(),
    style?.promptFragment
      ? `Rendered as ${style.promptFragment}.`
      : "Choose whichever illustration style explains this subject most clearly.",
    "Accurate, educational, and suitable for a classroom. Any text must be spelled correctly and legible.",
  ]
    .filter(Boolean)
    .join(" ");
}
