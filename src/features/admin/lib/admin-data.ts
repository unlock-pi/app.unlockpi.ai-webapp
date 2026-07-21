import type { User } from "@supabase/supabase-js";

import type {
  AdminDashboardData,
  AdminRealtimeSession,
  AdminUser,
  AdminVisualGeneration,
} from "@/features/admin/types/admin-types";
import { createAdminClient } from "@/lib/supabase-admin";

const PAGE_SIZE = 1000;

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createAdminClient();
  const [authUsers, profilesResult, activityResult, sessionsResult, visualsResult] =
    await Promise.all([
      listAllAuthUsers(),
      admin
        .from("profiles")
        .select("user_id, display_name, is_admin, last_active_at"),
      admin
        .from("user_activity_daily")
        .select("activity_date, user_id")
        .gte("activity_date", daysAgoDate(89)),
      admin
        .from("ai_realtime_sessions")
        .select(
          "id, owner_id, source, lesson_title, mode, model, status, started_at, ended_at, duration_seconds, response_count, input_text_tokens, input_audio_tokens, output_text_tokens, output_audio_tokens, estimated_cost_usd",
        )
        .order("started_at", { ascending: false })
        .limit(2000),
      admin
        .from("visuals")
        .select("id, owner_id, kind, title, model_tier, cost_usd, created_at")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

  if (profilesResult.error) throw profilesResult.error;
  if (activityResult.error) throw activityResult.error;
  if (sessionsResult.error) throw sessionsResult.error;
  if (visualsResult.error) throw visualsResult.error;

  const profileByUser = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.user_id, profile]),
  );
  const users: AdminUser[] = authUsers.map((user) => {
    const profile = profileByUser.get(user.id);
    return {
      id: user.id,
      email: user.email ?? "No email",
      name: getUserName(user, profile?.display_name),
      createdAt: user.created_at,
      lastActiveAt: profile?.last_active_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      isAdmin: profile?.is_admin ?? false,
    };
  });

  const activityByDay = new Map<string, Set<string>>();
  for (const row of activityResult.data ?? []) {
    const day = activityByDay.get(row.activity_date) ?? new Set<string>();
    day.add(row.user_id);
    activityByDay.set(row.activity_date, day);
  }

  const realtimeSessions: AdminRealtimeSession[] = (sessionsResult.data ?? []).map(
    (session) => ({
      id: session.id,
      ownerId: session.owner_id,
      source: session.source as "canvas" | "course",
      lessonTitle: session.lesson_title,
      mode: session.mode,
      model: session.model,
      status: session.status,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      durationSeconds: Number(session.duration_seconds),
      responseCount: Number(session.response_count),
      inputTokens:
        Number(session.input_text_tokens) + Number(session.input_audio_tokens),
      outputTokens:
        Number(session.output_text_tokens) + Number(session.output_audio_tokens),
      estimatedCostUsd:
        session.estimated_cost_usd === null
          ? null
          : Number(session.estimated_cost_usd),
    }),
  );

  const visualRows = visualsResult.data ?? [];
  const visualGenerations: AdminVisualGeneration[] = visualRows.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    kind: row.kind as "image" | "mermaid",
    title: row.title,
    modelTier: row.model_tier,
    costUsd: row.cost_usd === null ? null : Number(row.cost_usd),
    createdAt: row.created_at,
  }));
  const visualsSpend = {
    totalCostUsd: visualGenerations.reduce(
      (total, generation) => total + (generation.costUsd ?? 0),
      0,
    ),
    totalGenerations: visualGenerations.length,
    recent: visualGenerations.slice(0, 20),
  };

  return {
    users,
    activity: Array.from({ length: 90 }, (_, index) => {
      const date = daysAgoDate(89 - index);
      return { date, activeUsers: activityByDay.get(date)?.size ?? 0 };
    }),
    realtimeSessions,
    visualsSpend,
  };
}

async function listAllAuthUsers() {
  const admin = createAdminClient();
  const users: User[] = [];

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < PAGE_SIZE) break;
  }

  return users;
}

function getUserName(user: User, profileName?: string | null) {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return profileName || (typeof metadataName === "string" ? metadataName : null) || user.email?.split("@")[0] || "Tutor";
}

function daysAgoDate(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}
