/**
 * Mermaid generation config.
 *
 * When you add another diagram library later (Recharts, D3, etc.), add a
 * sibling file like `recharts-config.ts` and a matching route — don't try to
 * generalise this one. Keeping each generator self-contained is what makes
 * them easy to read and swap.
 */

import {
  DatabaseIcon,
  GitBranchIcon,
  ArrowLeftRightIcon,
  BoxesIcon,
  BrainIcon,
  WandIcon,
  WorkflowIcon,
} from "lucide-react";
import { z } from "zod";

/** Diagram kinds we let the model choose from, shown in the UI too. */
export const MERMAID_DIAGRAM_TYPES = [
  { id: "auto", label: "Auto", hint: "Let AI decide", icon: WandIcon },
  { id: "flowchart", label: "Flowchart", hint: "Processes & pipelines", icon: WorkflowIcon },
  { id: "sequenceDiagram", label: "Sequence", hint: "Step-by-step exchanges", icon: ArrowLeftRightIcon },
  { id: "classDiagram", label: "Class", hint: "Structures & relations", icon: BoxesIcon },
  { id: "stateDiagram-v2", label: "State", hint: "States & transitions", icon: GitBranchIcon },
  { id: "erDiagram", label: "ER", hint: "Data models", icon: DatabaseIcon },
  { id: "mindmap", label: "Mindmap", hint: "Concept breakdowns", icon: BrainIcon },
] as const;

export type MermaidDiagramType = (typeof MERMAID_DIAGRAM_TYPES)[number]["id"];

/** What we ask the model to return. `reasoning` keeps the model honest. */
export const mermaidResultSchema = z.object({
  reasoning: z
    .string()
    .describe("One or two sentences on why this diagram type and structure fit."),
  title: z.string().describe("Short human title for the diagram."),
  code: z.string().describe("The complete Mermaid source, no markdown fences."),
});

export type MermaidResult = z.infer<typeof mermaidResultSchema>;

/**
 * The rules below exist because Mermaid fails hard on small syntax slips.
 * Most breakage comes from unescaped punctuation inside node labels, so we
 * force quoted labels and ban the characters that cause parse errors.
 */
export function buildMermaidSystemPrompt(diagramType: MermaidDiagramType) {
  return [
    "You generate valid Mermaid diagram source for classroom teaching material.",
    "",
    "HARD RULES — a diagram that breaks these is useless:",
    "1. Output Mermaid source only. Never wrap it in markdown code fences.",
    "2. The first line must be the diagram declaration (e.g. `flowchart TD`).",
    diagramType === "auto"
      ? "3. Pick the diagram type that best fits the request."
      : `3. You must use the \`${diagramType}\` diagram type.`,
    "4. Always wrap node label text in double quotes: A[\"Intake valve\"] — not A[Intake valve].",
    "5. Never use these characters inside labels: ( ) { } [ ] < > # \" ; and never use <br>. Use plain words or a comma.",
    "6. Node ids must be simple alphanumerics (A, B1, step2). No spaces, dots, or dashes in ids.",
    "7. Do not use `end` as a node id — it is a reserved word. Use `finish` instead.",
    "8. Keep it to 15 nodes or fewer so it stays readable on screen.",
    "9. Do not add styling, classDef, click handlers, or comments.",
    "",
    "Accuracy matters more than detail — this is used to teach students.",
  ].join("\n");
}

/**
 * Strips the things models add anyway despite being told not to.
 * Cheap insurance before we hand the code to the renderer.
 */
export function sanitizeMermaidCode(raw: string): string {
  return raw
    .replace(/^\s*```(?:mermaid)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/<br\s*\/?>/gi, " ")
    .trim();
}
