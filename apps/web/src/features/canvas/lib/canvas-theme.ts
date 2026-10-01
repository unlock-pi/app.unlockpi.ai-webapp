import type { CSSProperties } from "react";

import type {
  CanvasFontFamily,
  CanvasThemeId,
  CanvasTypographyScale,
} from "@/features/canvas/types/canvas-types";

export const DEFAULT_CANVAS_THEME: CanvasThemeId = "default";
export const DEFAULT_CANVAS_TYPOGRAPHY_SCALE: CanvasTypographyScale = "medium";
export const DEFAULT_CANVAS_FONT_FAMILY: CanvasFontFamily = "modern";

export const canvasThemeOptions: Array<{
  id: CanvasThemeId;
  name: string;
  description: string;
  colors: [string, string, string];
}> = [
  {
    // Keeping the id as "default" (rather than renaming to "default-dark")
    // so every existing canvas already storing theme:"default" keeps its
    // look without a data migration — only the display name changes.
    id: "default",
    name: "Default dark",
    description: "Dark classroom canvas with UnlockPi red highlights.",
    colors: ["#050607", "#dc2626", "#f5f5f5"],
  },
  {
    id: "default-light",
    name: "Default light",
    description: "The same UnlockPi red accent on a bright classroom canvas.",
    colors: ["#f4f5f7", "#dc2626", "#151515"],
  },
  {
    id: "studio",
    name: "Studio",
    description: "Crisp white frames with a confident blue accent.",
    colors: ["#ffffff", "#2563eb", "#101318"],
  },
  {
    id: "notebook",
    name: "Notebook",
    description: "Warm paper, ink-black type, and a lively orange accent.",
    colors: ["#fffaf0", "#d85d24", "#252017"],
  },
  // {
  //   id: "chalkboard",
  //   name: "Chalkboard",
  //   description: "Deep green frames with soft chalk and mint details.",
  //   colors: ["#153a32", "#7dd3a7", "#f2f4df"],
  // },
  {
    id: "blueprint",
    name: "Blueprint",
    description: "Dark technical blue with bright cyan markers.",
    colors: ["#102a43", "#38bdf8", "#edf8ff"],
  },
];

export const canvasTypographyOptions: Array<{
  id: CanvasTypographyScale;
  name: string;
  description: string;
  previewSize: string;
}> = [
  {
    id: "base",
    name: "Large",
    description: "Best for normal classroom projection.",
    previewSize: "text-2xl",
  },
  {
    id: "medium",
    name: "Medium",
    description: "Fits denser explanations without feeling cramped.",
    previewSize: "text-lg",
  },
  {
    id: "small",
    name: "Small",
    description: "For code-heavy or information-dense frames.",
    previewSize: "text-base",
  },
];

export const canvasFontFamilyOptions: Array<{
  id: CanvasFontFamily;
  name: string;
  description: string;
  /** Actual CSS font-family value used for the "Aa" preview swatch. */
  previewFontFamily: string;
}> = [
  {
    id: "modern",
    name: "Modern",
    description: "Inter / Manrope / Space Grotesk — the default classroom look.",
    previewFontFamily: "var(--font-canvas-body), var(--font-system), sans-serif",
  },
  {
    id: "handwriting",
    name: "Handwriting",
    description: "Excalifont — a hand-drawn feel for sketch-style lessons.",
    previewFontFamily: '"Excalifont", var(--font-system), sans-serif',
  },
  {
    id: "old-school",
    name: "Old school",
    description: "A classic serif for a textbook, old-school look.",
    previewFontFamily:
      'Georgia, Cambria, "Times New Roman", Times, serif',
  },
  {
    id: "chalkboard",
    name: "Chalkboard",
    description: "A chalk-drawn feel, great paired with the Chalkboard theme.",
    previewFontFamily: '"Chalkboard Regular", var(--font-system), sans-serif',
  },
];

/**
 * Per-family override for the canvas's heading/subheading/body font
 * variables. "modern" is deliberately EMPTY — it sets nothing, so the
 * canvas simply inherits `--font-canvas-heading/subheading/body` from the
 * global `<html>` (next/font, already loaded for every page). Only
 * "handwriting", "old-school", and "chalkboard" locally shadow those
 * variables for the canvas subtree, which is what makes the extra font
 * opt-in per canvas rather than a global cost.
 */
const fontFamilyStyles: Record<CanvasFontFamily, CSSProperties> = {
  modern: {} as CSSProperties,
  handwriting: {
    "--font-canvas-heading": '"Excalifont", var(--font-system), sans-serif',
    "--font-canvas-subheading": '"Excalifont", var(--font-system), sans-serif',
    "--font-canvas-body": '"Excalifont", var(--font-system), sans-serif',
  } as CSSProperties,
  "old-school": {
    "--font-canvas-heading": 'Georgia, Cambria, "Times New Roman", Times, serif',
    "--font-canvas-subheading": 'Georgia, Cambria, "Times New Roman", Times, serif',
    "--font-canvas-body": 'Georgia, Cambria, "Times New Roman", Times, serif',
  } as CSSProperties,
  chalkboard: {
    "--font-canvas-heading": '"Chalkboard Regular", var(--font-system), sans-serif',
    "--font-canvas-subheading": '"Chalkboard Regular", var(--font-system), sans-serif',
    "--font-canvas-body": '"Chalkboard Regular", var(--font-system), sans-serif',
  } as CSSProperties,
};

const themeStyles: Record<CanvasThemeId, CSSProperties> = {
  default: {
    "--canvas-stage": "#050607",
    "--background": "#101112",
    "--foreground": "#f5f5f5",
    "--card": "#171717",
    "--card-foreground": "#f5f5f5",
    "--border": "#2a2a2a",
    "--muted": "#1f2022",
    "--muted-foreground": "#9a9a9a",
    "--primary": "#dc2626",
    "--primary-foreground": "#ffffff",
    "--canvas-shadow-color": "rgba(0,0,0,0.48)",
  } as CSSProperties,
  "default-light": {
    "--canvas-stage": "#f4f5f7",
    "--background": "#ffffff",
    "--foreground": "#151515",
    "--card": "#ffffff",
    "--card-foreground": "#151515",
    "--border": "#e2e5eb",
    "--muted": "#f2f3f6",
    "--muted-foreground": "#6b7280",
    "--primary": "#dc2626",
    "--primary-foreground": "#ffffff",
    "--canvas-shadow-color": "rgba(15,23,42,0.12)",
  } as CSSProperties,
  studio: {
    "--canvas-stage": "#e7ebf0",
    "--background": "#ffffff",
    "--foreground": "#101318",
    "--card": "#ffffff",
    "--card-foreground": "#101318",
    "--border": "#d7dee8",
    "--muted": "#eef2f7",
    "--muted-foreground": "#5d6878",
    "--primary": "#2563eb",
    "--primary-foreground": "#ffffff",
    "--canvas-shadow-color": "rgba(15,23,42,0.18)",
  } as CSSProperties,
  notebook: {
    "--canvas-stage": "#e9e1d2",
    "--background": "#fffaf0",
    "--foreground": "#252017",
    "--card": "#fffdf7",
    "--card-foreground": "#252017",
    "--border": "#ddcfb7",
    "--muted": "#f3e8d4",
    "--muted-foreground": "#746550",
    "--primary": "#d85d24",
    "--primary-foreground": "#ffffff",
    "--canvas-shadow-color": "rgba(78,57,28,0.18)",
  } as CSSProperties,
  chalkboard: {
    "--canvas-stage": "#0b2420",
    "--background": "#153a32",
    "--foreground": "#f2f4df",
    "--card": "#1a463c",
    "--card-foreground": "#f2f4df",
    "--border": "#3d665b",
    "--muted": "#214d43",
    "--muted-foreground": "#b8cabb",
    "--primary": "#7dd3a7",
    "--primary-foreground": "#0c2c25",
    "--canvas-shadow-color": "rgba(0,0,0,0.36)",
  } as CSSProperties,
  blueprint: {
    "--canvas-stage": "#071b2d",
    "--background": "#102a43",
    "--foreground": "#edf8ff",
    "--card": "#153b5c",
    "--card-foreground": "#edf8ff",
    "--border": "#315978",
    "--muted": "#193f60",
    "--muted-foreground": "#b8d4e8",
    "--primary": "#38bdf8",
    "--primary-foreground": "#082338",
    "--canvas-shadow-color": "rgba(0,0,0,0.38)",
  } as CSSProperties,
};

const typographyStyles: Record<CanvasTypographyScale, CSSProperties> = {
  base: {
    "--canvas-heading-size": "3rem",
    "--canvas-subheading-size": "1.875rem",
    "--canvas-body-size": "1rem",
    "--canvas-body-leading": "1.75rem",
  } as CSSProperties,
  medium: {
    "--canvas-heading-size": "2.5rem",
    "--canvas-subheading-size": "1.625rem",
    "--canvas-body-size": "0.9375rem",
    "--canvas-body-leading": "1.625rem",
  } as CSSProperties,
  small: {
    "--canvas-heading-size": "2rem",
    "--canvas-subheading-size": "1.375rem",
    "--canvas-body-size": "0.875rem",
    "--canvas-body-leading": "1.5rem",
  } as CSSProperties,
};

export function getCanvasThemeStyle(
  theme: CanvasThemeId = DEFAULT_CANVAS_THEME,
  typographyScale: CanvasTypographyScale = DEFAULT_CANVAS_TYPOGRAPHY_SCALE,
  fontFamily: CanvasFontFamily = DEFAULT_CANVAS_FONT_FAMILY,
) {
  return {
    ...themeStyles[theme],
    ...typographyStyles[typographyScale],
    ...fontFamilyStyles[fontFamily],
  } as CSSProperties;
}

export function isCanvasThemeId(value: unknown): value is CanvasThemeId {
  return canvasThemeOptions.some((theme) => theme.id === value);
}

export function isCanvasTypographyScale(
  value: unknown,
): value is CanvasTypographyScale {
  return canvasTypographyOptions.some((scale) => scale.id === value);
}

export function isCanvasFontFamily(value: unknown): value is CanvasFontFamily {
  return canvasFontFamilyOptions.some((family) => family.id === value);
}
