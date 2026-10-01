import { openai } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

import {
  buildMermaidSystemPrompt,
  mermaidResultSchema,
  sanitizeMermaidCode,
} from "@/features/visuals/lib/mermaid-config";
import {
  buildPanelSystemPrompt,
  codeResultSchema,
  type PanelGenerateRequest,
} from "@/features/canvas/lib/panel-generation";
import { createClient } from "@/lib/server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Fast model for text; the structured mermaid path uses a stronger one. */
const TEXT_MODEL = "gpt-4o-mini";
const STRUCTURED_MODEL = "gpt-4o";

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

  const body = (await request.json().catch(() => ({}))) as PanelGenerateRequest;
  const ask = (body.prompt || body.topic || "").trim();
  if (!ask) {
    return NextResponse.json({ error: "Nothing to generate." }, { status: 400 });
  }

  // The current-frame context keeps output relevant to what's on screen —
  // this is what stops the panel from wandering off-topic.
  const context = body.frameContext ? `\n\nContext of the current slide: ${body.frameContext}` : "";

  try {
    if (body.type === "mermaid") {
      const { object } = await generateObject({
        model: openai(STRUCTURED_MODEL),
        schema: mermaidResultSchema,
        system: buildMermaidSystemPrompt("auto"),
        prompt: `Create a diagram for: ${ask}${context}`,
      });
      return NextResponse.json({
        content: sanitizeMermaidCode(object.code),
        topic: object.title,
      });
    }

    if (body.type === "code") {
      const { object } = await generateObject({
        model: openai(STRUCTURED_MODEL),
        schema: codeResultSchema,
        system: buildPanelSystemPrompt("code"),
        prompt: `${ask}${context}`,
      });
      return NextResponse.json({
        content: object.code,
        language: object.language,
      });
    }

    // explanation | table — plain markdown text
    const { text } = await generateText({
      model: openai(TEXT_MODEL),
      system: buildPanelSystemPrompt(body.type),
      prompt: `${ask}${context}`,
    });
    return NextResponse.json({ content: text.trim() });
  } catch (error) {
    console.error("[canvas/panel-generate] failed:", error);
    return NextResponse.json(
      { error: "Could not generate that. Please try again." },
      { status: 502 },
    );
  }
}
