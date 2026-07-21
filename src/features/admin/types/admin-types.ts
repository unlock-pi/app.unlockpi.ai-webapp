export type AdminUser = {
  id: string;
  email: string;
  name: string;
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
};

export type AdminVisualGeneration = {
  id: string;
  ownerId: string;
  kind: "image" | "mermaid";
  title: string | null;
  modelTier: string | null;
  costUsd: number | null;
  createdAt: string;
};

export type AdminVisualSpend = {
  totalCostUsd: number;
  totalGenerations: number;
  recent: AdminVisualGeneration[];
};

export type AdminDashboardData = {
  users: AdminUser[];
  activity: AdminActivityDay[];
  realtimeSessions: AdminRealtimeSession[];
  visualsSpend: AdminVisualSpend;
};

