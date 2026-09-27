const STORAGE_KEY = "unlockpi:sound-enabled";

/**
 * Interaction sounds are a per-DEVICE preference, not a per-account one —
 * the same teacher usually wants them on at their desk and off on the
 * classroom projector. So this lives in localStorage alongside the theme
 * rather than in Supabase user metadata.
 *
 * cuelume's own `setEnabled()` deliberately doesn't persist anything; the
 * app owns the setting. These two helpers are that ownership.
 */
export function readSoundPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // Unset means "never chosen" — sounds are on by default.
    return raw === null ? true : raw === "true";
  } catch {
    // Private windows and blocked site-data both throw on access. Falling
    // back to the default keeps the app working; the choice just won't
    // survive a reload.
    return true;
  }
}

export function writeSoundPreference(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // Same story — the in-memory setEnabled() call still applies for this
    // session even when we can't persist it.
  }
}
