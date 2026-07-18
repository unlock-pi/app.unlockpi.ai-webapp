import { NextRequest, NextResponse } from "next/server";

import { onboardingSteps } from "@/features/onboarding/lib/onboarding-steps";
import { createClient } from "@/lib/server";

export const runtime = "nodejs";

const DEFAULT_REALTIME_MODEL = "gpt-realtime-2";
const DEFAULT_REALTIME_VOICE = "marin";

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

  const model = process.env.OPENAI_REALTIME_MODEL ?? DEFAULT_REALTIME_MODEL;
  const voice = process.env.OPENAI_REALTIME_VOICE ?? DEFAULT_REALTIME_VOICE;

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
          output_modalities: ["audio"],
          instructions: buildOnboardingInstructions(),
          audio: {
            input: { turn_detection: { type: "semantic_vad" } },
            output: { voice },
          },
          tools: [
            {
              type: "function",
              name: "select_onboarding_option",
              description:
                "Call this the moment the user states their choice out loud for the CURRENT question only. Never call it for a question that isn't current.",
              parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  option_id: {
                    type: "string",
                    description: "The id of the option the user chose for the current question.",
                  },
                },
                required: ["option_id"],
              },
            },
          ],
          tool_choice: "auto",
        },
      }),
    });
  } catch (err) {
    console.error("[Realtime onboarding] Failed to reach OpenAI:", err);
    return NextResponse.json(
      { error: "Unable to reach OpenAI's Realtime API. Please try again." },
      { status: 502 },
    );
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to create the onboarding Realtime session.", details: data },
      { status: response.status },
    );
  }

  return NextResponse.json(data);
}

function buildOnboardingInstructions() {
  return [
    "You are UnlockPi's friendly onboarding guide, speaking to a brand-new user.",
    "You will walk them through a short list of questions, one at a time.",
    "For each question, read it naturally, then read out the available options.",
    "The moment the user states their choice, call select_onboarding_option with that option's id — do not ask them to confirm first.",
    "Only ever act on the CURRENT question. The client will tell you which question is current and will update you as soon as it changes; forget earlier questions once they're answered.",
    "Keep every spoken turn to one or two short sentences. This is onboarding, not a lecture.",
    "FULL QUESTION FLOW (for your context only — always defer to the current-question update for what to actually ask):",
    JSON.stringify(onboardingSteps),
  ].join("\n");
}
