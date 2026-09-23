export type AdminUser = {
  id: string;
  email: string;
  name: string;
  /** From Supabase user_metadata.avatar_url — null falls back to initials. */
  avatarUrl: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  lastSignInAt: string | null;
  isAdmin: boolean;
};

export type AdminActivityDay = {
  date: string;
  activeUsers: number;
};

export type AdminRealtimeSession = {
  id: string;
  ownerId: string;
  source: "canvas" | "course";
  lessonTitle: string;
  mode: string;
  model: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  responseCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number | null;
  /** Rate card that produced estimatedCostUsd, e.g. "gpt-realtime-2@2025-08-28". */
  pricingVersion: string | null;
};

export type AdminVisualGeneration = {
  id: string;
  ownerId: string;
  kind: "image" | "mermaid";
  title: string | null;
  modelTier: string | null;
  costUsd: number | null;
  /** Null when the generating model had no rate card — cost is unknown, not zero. */
  pricingVersion: string | null;
  createdAt: string;
};

export type AdminVisualSpend = {
  totalCostUsd: number;
  totalGenerations: number;
  recent: AdminVisualGeneration[];
  /** Per-owner rollup for the Users table & user drilldown. */
  byOwner: Record<string, { count: number; costUsd: number }>;
  /** Split by kind for the Spend view. */
  byKind: { kind: string; count: number; costUsd: number }[];
};

export type AdminDashboardData = {
  users: AdminUser[];
  activity: AdminActivityDay[];
  realtimeSessions: AdminRealtimeSession[];
  /** Full list (not capped like visualsSpend.recent) so pages can range-filter it themselves. */
  visualGenerations: AdminVisualGeneration[];
  visualsSpend: AdminVisualSpend;
};

/**
 * One tool call an agent made, as recorded by ai_agent_tool_calls.
 *
 * This is the row the credits question is answered from: what ran, which
 * tutor ran it, whether it worked, and which response it was billed inside.
 */
export type AdminAgentToolCall = {
  id: string;
  usageSessionId: string;
  ownerId: string;
  /** The response this call happened inside; null when the surface could not say. */
  responseId: string | null;
  agent: string;
  toolName: string;
  ok: boolean;
  durationMs: number;
  createdAt: string;
};

/** What one response cost, from ai_realtime_responses. */
export type AdminResponseCost = {
  usageSessionId: string;
  responseId: string;
  inputTokens: number;
  outputTokens: number;
  /** Null when the model had no rate card — unknown, not free. */
  costUsd: number | null;
};

/** A tool call with its share of the response it was billed inside. */
export type AdminToolAttribution = AdminAgentToolCall & {
  costUsd: number | null;
  tokens: number | null;
  /** How many other calls shared this response's bill. */
  sharedWith: number;
};

export type AdminToolRollup = {
  key: string;
  calls: number;
  failures: number;
  costUsd: number;
  tokens: number;
  /** Calls in this group whose cost could not be determined. */
  unpriced: number;
  totalDurationMs: number;
  averageDurationMs: number;
};
