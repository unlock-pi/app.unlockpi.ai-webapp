import { NextRequest, NextResponse } from "next/server";

import {
  estimateSessionFromDuration,
  getRealtimeUsageRecord,
} from "@/features/realtime/lib/realtime-usage-server";
import type { RealtimeTokenUsage } from "@/features/realtime/types/realtime-usage";
import { createClient } from "@/lib/server";

export const runtime = "nodejs";

type UsageRequest =
  | {
      action: "response";
      usageSessionId: string;
      responseId: string;
      usage: RealtimeTokenUsage;
    }
  | {
      action: "finish";
      usageSessionId: string;
      status?: "completed" | "failed";
    };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as UsageRequest | null;
  if (!body?.usageSessionId) {
    return NextResponse.json({ error: "Invalid usage event" }, { status: 400 });
  }

  if (body.action === "response") {
    const { data: usageSession, error: sessionError } = await supabase
      .from("ai_realtime_sessions")
      .select("model")
      .eq("id", body.usageSessionId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (sessionError || !usageSession) {
      return NextResponse.json(
        { error: sessionError?.message ?? "Realtime session not found" },
        { status: sessionError ? 400 : 404 },
      );
    }

    const { error } = await supabase.from("ai_realtime_responses").upsert(
      {
        usage_session_id: body.usageSessionId,
        owner_id: user.id,
        response_id: body.responseId,
        ...getRealtimeUsageRecord(body.usage, usageSession.model),
      },
      { onConflict: "usage_session_id,response_id", ignoreDuplicates: true },
    );
    if (error) {
      // The client sends this with keepalive+fire-and-forget, so this log is
      // the ONLY place a broken insert (e.g. a missing column because a
      // migration hasn't been run) will ever surface. Without it, cost
      // tracking can silently stop with zero visible symptoms.
      console.error(
        "[realtime usage] failed to record response cost — check that all migrations under supabase/migrations have been applied:",
        error,
      );
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "finish") {
    const { error } = await supabase
      .from("ai_realtime_sessions")
      .update({
        status: body.status === "failed" ? "failed" : "completed",
        ended_at: new Date().toISOString(),
      })
      .eq("id", body.usageSessionId)
      .eq("owner_id", user.id);

    if (error) {
      console.error("[realtime usage] failed to finish session:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Safety net: OpenAI only reports tokens inside `response.done`, but bills
    // for mic audio the entire time it streams. A session where the model
    // never responded (common in the deliberately-silent Copilot mode) would
    // otherwise record zero usage despite costing real money. Fall back to a
    // duration-based input-audio estimate so no session ends up blank.
    const { data: finished } = await supabase
      .from("ai_realtime_sessions")
      .select("duration_seconds, response_count, model, estimated_cost_usd")
      .eq("id", body.usageSessionId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (
      finished &&
      finished.response_count === 0 &&
      finished.estimated_cost_usd === null &&
      Number(finished.duration_seconds) > 0
    ) {
      const estimate = estimateSessionFromDuration(
        Number(finished.duration_seconds),
        finished.model,
      );
      if (estimate) {
        const { error: estimateError } = await supabase
          .from("ai_realtime_sessions")
          .update(estimate)
          .eq("id", body.usageSessionId)
          .eq("owner_id", user.id);
        if (estimateError) {
          console.error(
            "[realtime usage] failed to write duration estimate:",
            estimateError,
          );
        }
      }
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown usage action" }, { status: 400 });
}
