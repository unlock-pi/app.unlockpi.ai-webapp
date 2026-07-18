import type {
  AdminRealtimeSession,
  AdminUser,
} from "@/features/admin/types/admin-types";

export function exportUsersToCSV(
  users: AdminUser[],
  sessions: AdminRealtimeSession[]
) {
  const userStats = new Map<string, { sessions: number; duration: number; cost: number }>();

  for (const session of sessions) {
    if (session.estimatedCostUsd === null) continue;
    const current = userStats.get(session.ownerId) ?? {
      sessions: 0,
      duration: 0,
      cost: 0,
    };
    current.sessions += 1;
    current.duration += session.durationSeconds;
    current.cost += session.estimatedCostUsd;
    userStats.set(session.ownerId, current);
  }

  const rows = users.map((user) => {
    const stats = userStats.get(user.id);
    return {
      Name: user.name,
      Email: user.email,
      "Joined Date": formatDateISO(user.createdAt),
      "Last Active": user.lastActiveAt ? formatDateISO(user.lastActiveAt) : "Never",
      "Sessions Count": stats?.sessions ?? 0,
      "Classroom Time (hours)": stats ? (stats.duration / 3600).toFixed(2) : "0",
      "Total Spend (USD)": stats ? stats.cost.toFixed(4) : "0",
      "Is Admin": user.isAdmin ? "Yes" : "No",
    };
  });

  downloadCSV("tutors.csv", rows);
}

export function exportSessionsToCSV(
  sessions: AdminRealtimeSession[],
  userById: Map<string, AdminUser>
) {
  const rows = sessions.map((session) => {
    const user = userById.get(session.ownerId);
    return {
      "Session ID": session.id,
      "Lesson Title": session.lessonTitle,
      "Tutor Name": user?.name ?? "Unknown",
      "Tutor Email": user?.email ?? "—",
      Source: session.source,
      Mode: session.mode,
      Model: session.model,
      "Started At": formatDateISO(session.startedAt),
      "Duration (seconds)": session.durationSeconds,
      "Duration (minutes)": (session.durationSeconds / 60).toFixed(2),
      "Response Count": session.responseCount,
      "Input Tokens": session.inputTokens,
      "Output Tokens": session.outputTokens,
      "Total Tokens": session.inputTokens + session.outputTokens,
      Status: session.status,
      "Estimated Cost (USD)": session.estimatedCostUsd?.toFixed(4) ?? "Not configured",
    };
  });

  downloadCSV("sessions.csv", rows);
}

export function exportDashboardSnapshot(
  users: AdminUser[],
  sessions: AdminRealtimeSession[],
  dateRange: string,
  activeUserCount: number
) {
  const timestamp = new Date().toISOString();
  const totalMinutes = Math.round(
    sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / 60
  );
  const totalCost = sessions.reduce((sum, s) => sum + (s.estimatedCostUsd ?? 0), 0);

  const row = {
    "Export Timestamp": timestamp,
    "Date Range": dateRange,
    "Total Tutors": users.length,
    "Active Tutors": activeUserCount,
    "AI Sessions": sessions.length,
    "Classroom Time (hours)": (totalMinutes / 60).toFixed(2),
    "Estimated Total Spend (USD)": totalCost.toFixed(4),
    "Average Cost Per Session (USD)": (totalCost / Math.max(sessions.length, 1)).toFixed(4),
  };

  downloadCSV(`dashboard-snapshot-${formatDateFileISO(timestamp)}.csv`, [row]);
}

function downloadCSV<T extends Record<string, string | number | boolean>>(
  filename: string,
  data: T[]
) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.map(escapeCSVField).join(","),
    ...data.map((row) =>
      headers.map((header) => escapeCSVField(String(row[header]))).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSVField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function formatDateISO(dateString: string): string {
  return new Date(dateString).toISOString().split("T")[0];
}

function formatDateFileISO(dateString: string): string {
  return new Date(dateString).toISOString().replace(/[:.]/g, "-").split("T")[0];
}
