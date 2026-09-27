"use client";

import { useEffect } from "react";
import { bind, setEnabled } from "cuelume";

import { readSoundPreference } from "@/lib/sound-preference";

/**
 * Calls cuelume's `bind()` once for the whole app so any `data-cuelume-*`
 * attribute anywhere becomes audible.
 *
 * `bind()` uses delegated listeners on the document, so it is idempotent and
 * keeps working for elements React mounts later — no re-binding after route
 * changes, Puck remounts, or dialogs opening. Mounted from the root layout
 * rather than per-feature so there is exactly one call site.
 *
 * Nothing plays until the user's first interaction: cuelume creates its
 * AudioContext lazily and treats blocked autoplay as a silent no-op.
 */
export function CuelumeBinder() {
  useEffect(() => {
    bind();
    // Re-apply the saved choice on every load. cuelume's enabled flag is
    // in-memory only, so without this a teacher who muted sounds would hear
    // them again on the next page load.
    setEnabled(readSoundPreference());
  }, []);

  return null;
}
