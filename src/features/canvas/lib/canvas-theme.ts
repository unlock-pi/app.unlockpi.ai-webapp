import type { CSSProperties } from "react";

import type {
  CanvasThemeId,
  CanvasTypographyScale,
} from "@/features/canvas/types/canvas-types";

export const DEFAULT_CANVAS_THEME: CanvasThemeId = "default";
export const DEFAULT_CANVAS_TYPOGRAPHY_SCALE: CanvasTypographyScale = "medium";

export const canvasThemeOptions: Array<{
  id: CanvasThemeId;
  name: string;
  description: string;
  colors: [string, string, string];
}> = [
  {
    id: "default",
    name: "Default",
    description: "Follows the app theme so dark mode stays dark and light mode stays light.",
    colors: ["#050607", "#dc2626", "#f5f5f5"],
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

const themeStyles: Record<CanvasThemeId, CSSProperties> = {
  default: {
    "--canvas-stage": "var(--canvas-app-stage)",
    "--background": "var(--canvas-app-background)",
    "--foreground": "var(--canvas-app-foreground)",
    "--card": "var(--canvas-app-card)",
    "--card-foreground": "var(--canvas-app-card-foreground)",
    "--border": "var(--canvas-app-border)",
    "--muted": "var(--canvas-app-muted)",
    "--muted-foreground": "var(--canvas-app-muted-foreground)",
    "--primary": "var(--canvas-app-primary)",
    "--primary-foreground": "var(--canvas-app-primary-foreground)",
    "--canvas-shadow-color": "var(--canvas-app-shadow-color)",
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
) {
  return {
    ...themeStyles[theme],
    ...typographyStyles[typographyScale],
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
