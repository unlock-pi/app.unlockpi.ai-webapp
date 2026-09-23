import { NextRequest, NextResponse } from "next/server";

import {
  STACKS_AGENT_NAME,
  buildStacksAgentInstructions,
  getStackRealtimeTools,
} from "@/features/stacks-agent/lib/agent-identity";
import { createRealtimeUsageSession } from "@/features/realtime/lib/realtime-usage-server";
import { createClient } from "@/lib/server";

export const runtime = "nodejs";

const DEFAULT_REALTIME_MODEL = "gpt-realtime-2";
const DEFAULT_REALTIME_VOICE = "marin";
const DEFAULT_TRANSCRIPTION_MODEL = "gpt-4o-mini-transcribe";
/** ISO-639-1. The one language the agent hears in and answers in. */
const DEFAULT_LANGUAGE = "en";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    canvasId?: string;
    lessonTitle?: string;
    /** "audio" speaks aloud; "silent" drives the board without talking. */
    responseMode?: "audio" | "silent";
  };

  const speaks = body.responseMode !== "silent";
  const model = process.env.OPENAI_REALTIME_MODEL ?? DEFAULT_REALTIME_MODEL;
  const voice = process.env.OPENAI_REALTIME_VOICE ?? DEFAULT_REALTIME_VOICE;
  const transcriptionModel =
    process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL ?? DEFAULT_TRANSCRIPTION_MODEL;
  const language = process.env.OPENAI_REALTIME_LANGUAGE ?? DEFAULT_LANGUAGE;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { anchor: "created_at", seconds: 600 },
        session: {
          type: "realtime",
          model,
          output_modalities: speaks ? ["audio"] : ["text"],
          instructions: buildStacksAgentInstructions({
            lessonTitle: body.lessonTitle,
            speaks,
            language,
          }),
          audio: {
            input: {
              turn_detection: { type: "semantic_vad" },
              // Off by default in the Realtime API. Without it the session
              // never reports what it heard, so the activity panel cannot
              // show whether the teacher's words actually arrived.
              // Pinning the language stops accented speech being transcribed
              // into another language or script — which the model then tends
              // to answer in.
              transcription: { model: transcriptionModel, language },
            },
            ...(speaks ? { output: { voice } } : {}),
          },
          // Derived from the same Zod schemas the client executes, so the
          // model can never be offered a tool the app cannot run.
          tools: getStackRealtimeTools(),
          tool_choice: "auto",
        },
      }),
    });
  } catch (error) {
    console.error(`[${STACKS_AGENT_NAME}] Failed to reach OpenAI:`, error);
    return NextResponse.json(
      { error: "Unable to reach OpenAI's Realtime API. Please try again." },
      { status: 502 },
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: `Unable to start the ${STACKS_AGENT_NAME} session.`, details: data },
      { status: response.status },
    );
  }

  const usageSessionId = await createRealtimeUsageSession({
    supabase,
    ownerId: user.id,
    source: "canvas",
    lessonTitle: body.lessonTitle ?? `${STACKS_AGENT_NAME} — stacks`,
    mode: speaks ? "audio" : "listen_only",
    model,
    canvasId: body.canvasId,
    openaiSessionId: data?.session?.id ?? data?.id,
  });

  return NextResponse.json({ ...data, model, usage_session_id: usageSessionId });
}
