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
  /** Sum of input_text + input_audio (INCLUDES the cached portion, matching OpenAI's own top-level total). */
  inputTokens: number;
  /** Sum of output_text + output_audio. */
  outputTokens: number;
  /** Canvas frame this session was teaching on, when the source is "canvas". */
  canvasId: string | null;
  /** OpenAI's own id for the realtime call — for correlating with their dashboard or support. */
  openaiSessionId: string | null;
  /**
   * Per-modality breakdown — this is what unit economics actually turns on:
   * audio tokens are priced far above text tokens (see realtime-pricing.ts),
   * so two sessions with the same total token count can cost very
   * differently depending on the mix. `inputTextTokens`/`inputAudioTokens`
   * already INCLUDE their cached portion; `cached*Tokens` is the discounted
   * subset of each, not an addition on top.
   */
  inputTextTokens: number;
  inputAudioTokens: number;
  cachedTextTokens: number;
  cachedAudioTokens: number;
  outputTextTokens: number;
  outputAudioTokens: number;
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

