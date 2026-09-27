"use client";

/**
 * Orchestrates spoken commands for the PN-junction demo — same job, same
 * shape, as `use-waveform-player.ts`: remember the current target scene, log
 * a summary, play a cue. `PNJunctionView` does the actual work of getting
 * from the old picture to the new one.
 */
import { useCallback, useState } from "react";
import { play as playCue } from "cuelume";

import { pnJunctionScene, type PNJunctionScene } from "./pn-junction-frame";
import type { PNResult } from "./pn-ops";

const IDLE_SCENE: PNJunctionScene = pnJunctionScene({ note: "" });

export function usePNJunctionPlayer() {
  const [scene, setScene] = useState<PNJunctionScene>(IDLE_SCENE);
  const [log, setLog] = useState<string[]>([]);

  const run = useCallback((result: PNResult) => {
    setScene(result.scene);
    if (result.startCue) playCue(result.startCue);
    setLog((previous) => [result.summary, ...previous].slice(0, 8));
  }, []);

  return { scene, log, run };
}
