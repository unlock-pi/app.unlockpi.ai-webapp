import { NextRequest, NextResponse } from "next/server";

import { createRealtimeUsageSession } from "@/features/realtime/lib/realtime-usage-server";
import { createClient } from "@/lib/server";

export const runtime = "nodejs";

const DEFAULT_REALTIME_MODEL = "gpt-realtime-2";
const DEFAULT_REALTIME_VOICE = "marin";

type FrameContext = {
  frame_number: number;
  title: string;
  block_types?: string[];
  searchable_content: string;
};

type RealtimeMode = "director" | "companion";

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
    canvasTitle?: string;
    canvasId?: string;
    frames?: FrameContext[];
    mode?: RealtimeMode;
  };
  const frames = Array.isArray(body.frames) ? body.frames.slice(0, 100) : [];
  const mode: RealtimeMode =
    body.mode === "companion" ? "companion" : "director";
  const model = process.env.OPENAI_REALTIME_MODEL ?? DEFAULT_REALTIME_MODEL;
  const voice = process.env.OPENAI_REALTIME_VOICE ?? DEFAULT_REALTIME_VOICE;

  let response: Response;
  try {
    response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
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
          output_modalities: mode === "companion" ? ["audio"] : ["text"],
          instructions: buildSessionInstructions(
            body.canvasTitle,
            frames,
            mode,
          ),
          audio: {
            input: {
              turn_detection: { type: "semantic_vad" },
            },
            ...(mode === "companion" ? { output: { voice } } : {}),
          },
          tools: [
            {
              type: "function",
              name: "control_canvas",
              description:
                "Navigate or temporarily manipulate the visible classroom presentation. Changes apply only to the live presentation and never edit the authored canvas.",
              parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  action: {
                    type: "string",
                    enum: [
                      "next",
                      "previous",
                      "first",
                      "last",
                      "goto",
                      "find",
                      "add_array",
                      "set_array",
                      "resize_array",
                      "highlight_array_index",
                      "clear_array_highlight",
                    ],
                    description: "The live presentation action.",
                  },
                  frame_number: {
                    type: "integer",
                    description: "One-based frame number for goto.",
                  },
                  query: {
                    type: "string",
                    description: "Content or title to locate for find.",
                  },
                  title: {
                    type: "string",
                    description: "Optional title for a newly added array.",
                  },
                  values: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array values for add_array or set_array.",
                  },
                  length: {
                    type: "integer",
                    description: "Requested array length for resize_array.",
                  },
                  index: {
                    type: "integer",
                    description: "Array index to highlight.",
                  },
                },
                required: ["action"],
              },
            },
            {
              type: "function",
              name: "show_in_panel",
              description:
                "Render supporting material in the class side panel WITHOUT changing the teacher's slides. Use when the teacher asks you to explain, define, diagram, tabulate, or show a code example for something. The panel appears next to the slide; it never edits the authored canvas.",
              parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  type: {
                    type: "string",
                    enum: ["explanation", "mermaid", "table", "code"],
                    description:
                      "explanation = short text; mermaid = a diagram; table = a comparison/reference table; code = a code example.",
                  },
                  topic: {
                    type: "string",
                    description: "Short label for the panel item, e.g. 'Binary search'.",
                  },
                  prompt: {
                    type: "string",
                    description:
                      "What to generate, in one sentence. Be specific about the concept the teacher asked for.",
                  },
                },
                required: ["type", "topic", "prompt"],
              },
            },
            {
              type: "function",
              name: "present_walkthrough",
              description:
                "Start a guided, paced walkthrough of a range of frames. Use this when the teacher asks you to walk through, summarise, revise, or go frame by frame. After you call this, the client moves to each frame and prompts you to explain ONLY that frame before advancing — so your narration always matches what is on screen.",
              parameters: {
                type: "object",
                additionalProperties: false,
                properties: {
                  from_frame: {
                    type: "integer",
                    description: "One-based first frame. Defaults to 1.",
                  },
                  to_frame: {
                    type: "integer",
                    description: "One-based last frame. Defaults to the final frame.",
                  },
                },
                required: [],
              },
            },
          ],
          tool_choice: "auto",
          },
        }),
      },
    );
  } catch (err) {
    console.error("[Realtime canvas] Failed to reach OpenAI:", err);
    return NextResponse.json(
      { error: "Unable to reach OpenAI's Realtime API. Please try again." },
      { status: 502 },
    );
  }
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      {
        error: "Unable to create the canvas Realtime session.",
        details: data,
      },
      { status: response.status },
    );
  }

  const usageSessionId = await createRealtimeUsageSession({
    supabase,
    ownerId: user.id,
    source: "canvas",
    lessonTitle: body.canvasTitle ?? "Untitled canvas",
    mode,
    model,
    canvasId: body.canvasId,
    openaiSessionId: data?.session?.id ?? data?.id,
  });

  return NextResponse.json({
    ...data,
    mode,
    model,
    usage_session_id: usageSessionId,
  });
}

function buildSessionInstructions(
  canvasTitle: string | undefined,
  frames: FrameContext[],
  mode: RealtimeMode,
) {
  return [
    mode === "director"
      ? "You are Copilot, a silent classroom presentation assistant for UnlockPi. The teacher is the presenter and hero; you are their in-sync assistant who keeps the board matching what they teach."
      : "You are Co-teacher, a concise spoken classroom co-teacher for UnlockPi. The teacher leads; you complement them.",
    "Listen to the teacher's natural speech and change the visible frame only when their intent is clear.",
    "Teachers may say slide or page; both mean frame.",
    "Use control_canvas for next, previous, first, last, explicit frame numbers, or requests to show content found in the frame inventory.",
    "For a semantic request such as 'show the array with numbers', choose the best frame from the inventory and use goto with its frame_number.",
    "If the teacher explicitly asks to show or create a new array example and no suitable frame exists, use add_array with clear sample values.",
    "When the teacher explicitly asks to add, replace, resize, or highlight an array example, call control_canvas with the matching array action.",
    "When the teacher asks you to EXPLAIN, DEFINE, DIAGRAM, TABULATE, or show a CODE EXAMPLE for something, call show_in_panel with the right type. This puts supporting material in the side panel next to the slide and never changes the teacher's authored frames. Prefer this over navigating when the teacher wants new supporting content rather than an existing frame.",
    // The sync contract — this is what keeps narration locked to the visuals.
    "STAY IN SYNC — this is critical: Never describe a frame that is not currently shown. To talk about a frame, navigate to it FIRST, then explain only what is now on screen. Never explain ahead of the visuals.",
    "Navigate ONE frame at a time. Never call control_canvas several times in a row before speaking — that races ahead of the class.",
    "When the teacher asks you to walk through / summarise / revise / go frame by frame, call present_walkthrough. After that, explain only the frame the client shows you, then call control_canvas next to advance. Do not jump ahead or narrate multiple frames at once.",
    "Live visual changes are temporary classroom overlays. Do not claim that the authored canvas was edited or saved.",
    "Do not navigate for ordinary teaching sentences that merely discuss the currently visible content.",
    // Sight: the client streams a `now_showing` system message every time the
    // visible frame changes. This is the single source of truth for where the
    // class currently is — always trust the most recent one over the static
    // inventory, and never assume the current frame from your own last action.
    "IMPORTANT — staying in sync: You will receive `now_showing` system messages whenever the visible frame changes, including when the teacher navigates manually. Always treat the MOST RECENT `now_showing` as the current frame. Do not assume the current frame from your own previous tool calls.",
    "Each frame lists its block_types (e.g. Array, Code, Mermaid, Table) so you know what kind of content is present without seeing it rendered.",
    mode === "director"
      ? "You are voice-input and silent-output: never narrate or answer aloud. Prefer a tool call or no response."
      : "Respond aloud only when useful. Be brief, classroom-friendly, and never talk over the teacher.",
    `Canvas: ${canvasTitle || "Untitled canvas"}.`,
    "FRAME INVENTORY (static snapshot from connect time — for the live current frame, trust `now_showing`):",
    JSON.stringify(frames),
  ].join("\n");
}
