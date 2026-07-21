import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextRequest, NextResponse } from "next/server";

import {
  buildMermaidSystemPrompt,
  mermaidResultSchema,
  sanitizeMermaidCode,
  type MermaidDiagramType,
} from "@/features/visuals/lib/mermaid-config";
import { ESTIMATED_MERMAID_COST_USD } from "@/features/visuals/lib/visual-config";
import { createClient } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Swap this if you want a different reasoning model for diagrams. */
const MERMAID_MODEL = "gpt-4o";

type RequestBody = {
  description?: string;
  diagramType?: MermaidDiagramType;
  /**
   * Set by the client when Mermaid failed to parse the previous attempt.
   * We feed the parser error straight back so the model can repair it.
   */
  repairError?: string;
  previousCode?: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as RequestBody;
  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json(
      { error: "Describe the diagram you want." },
      { status: 400 },
    );
  }

  const diagramType: MermaidDiagramType = body.diagramType ?? "auto";

  const prompt = body.repairError
    ? [
        `The following Mermaid code failed to parse:`,
        body.previousCode ?? "",
        ``,
        `Parser error: ${body.repairError}`,
        ``,
        `Rewrite it so it parses cleanly. Keep the same meaning. Original request: ${description}`,
      ].join("\n")
    : `Create a diagram for: ${description}`;

  let result;
  try {
    result = await generateObject({
      model: openai(MERMAID_MODEL),
      schema: mermaidResultSchema,
      system: buildMermaidSystemPrompt(diagramType),
      prompt,
    });
  } catch (error) {
    console.error("[visuals/mermaid] generation failed:", error);
    return NextResponse.json(
      { error: "Could not generate the diagram. Please try again." },
      { status: 502 },
    );
  }

  const code = sanitizeMermaidCode(result.object.code);

  // A repair attempt isn't saved until the client confirms it renders.
  if (body.repairError) {
    return NextResponse.json({
      visual: { kind: "mermaid", title: result.object.title, mermaid_code: code },
      reasoning: result.object.reasoning,
      unsaved: true,
    });
  }

  const { data: saved, error: saveError } = await supabase
    .from("visuals")
    .insert({
      owner_id: user.id,
      kind: "mermaid" as const,
      title: result.object.title,
      prompt: description,
      style: diagramType,
      mermaid_code: code,
      cost_usd: ESTIMATED_MERMAID_COST_USD,
    })
    .select()
    .single();

  if (saveError) {
    console.error("[visuals/mermaid] could not persist:", saveError);
    return NextResponse.json({
      visual: { kind: "mermaid", title: result.object.title, mermaid_code: code },
      reasoning: result.object.reasoning,
      warning: "Generated, but could not be saved to your library.",
    });
  }

  return NextResponse.json({ visual: saved, reasoning: result.object.reasoning });
}
