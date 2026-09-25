/** Shared formatting helpers for the admin panel. */

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCost(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

export function formatMinutes(seconds: number) {
  return `${Math.round(seconds / 60)}m`;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Just the clock time, e.g. "2:14 PM" — pairs with `formatDate` for a "date, then time" layout. */
export function formatClockTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * A session's start/end as one "from → to" line. Same calendar day (the
 * common case) collapses to just the two times; spanning midnight spells out
 * both dates so it's never ambiguous which day "11:58 PM → 12:04 AM" means.
 */
export function formatTimeRange(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  if (!endedAt) return `${formatClockTime(startedAt)} → —`;

  const end = new Date(endedAt);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${formatClockTime(startedAt)} → ${formatClockTime(endedAt)}`
    : `${formatDate(startedAt)}, ${formatClockTime(startedAt)} → ${formatDate(endedAt)}, ${formatClockTime(endedAt)}`;
}

export function formatRelative(value: string | null) {
  if (!value) return "Never";
  const diffMs = Date.now() - new Date(value).getTime();
  const day = 86_400_000;
  if (diffMs < day) return "Today";
  const days = Math.floor(diffMs / day);
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
