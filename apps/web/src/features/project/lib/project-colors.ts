// Deterministic "random" pastel per project — same project always gets the
// same color (stable across reloads/re-renders), picked by hashing its id.
// No color is persisted anywhere yet; swap this for a stored per-project
// color once users can actually choose one.
const PROJECT_TINTS = [
  { surface: "bg-rose-100 dark:bg-rose-500/15", icon: "text-rose-600 dark:text-rose-400" },
  { surface: "bg-amber-100 dark:bg-amber-500/15", icon: "text-amber-600 dark:text-amber-400" },
  { surface: "bg-lime-100 dark:bg-lime-500/15", icon: "text-lime-700 dark:text-lime-400" },
  { surface: "bg-emerald-100 dark:bg-emerald-500/15", icon: "text-emerald-600 dark:text-emerald-400" },
  { surface: "bg-cyan-100 dark:bg-cyan-500/15", icon: "text-cyan-600 dark:text-cyan-400" },
  { surface: "bg-sky-100 dark:bg-sky-500/15", icon: "text-sky-600 dark:text-sky-400" },
  { surface: "bg-violet-100 dark:bg-violet-500/15", icon: "text-violet-600 dark:text-violet-400" },
  { surface: "bg-fuchsia-100 dark:bg-fuchsia-500/15", icon: "text-fuchsia-600 dark:text-fuchsia-400" },
] as const;

function hashToIndex(value: string, modulo: number): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % modulo;
}

export function getProjectTint(projectId: string) {
  return PROJECT_TINTS[hashToIndex(projectId, PROJECT_TINTS.length)];
}
