"use client";

/**
 * Orchestrates spoken commands for the AM demo — same job as
 * `use-circuit-player`/`use-array-player` (run a command, log it, play its
 * cue), but much thinner: there's no sequence of frames to step through here.
 * Each `am-ops.ts` function returns one complete target scene, and
 * `WaveformView` handles the actual glide from whatever's on screen now to
 * that target — so this hook only needs to remember the target and hand out
 * a sound cue and a log line.
 */
import { useCallback, useState } from "react";
import { play as playCue } from "cuelume";

import { waveformScene, type WaveformScene } from "./waveform-frame";
import type { AMResult } from "./am-ops";

const IDLE_SCENE: WaveformScene = waveformScene({ modulationIndex: 0, note: "" });

export function useWaveformPlayer() {
  const [scene, setScene] = useState<WaveformScene>(IDLE_SCENE);
  const [log, setLog] = useState<string[]>([]);

  const run = useCallback((result: AMResult) => {
    setScene(result.scene);
    if (result.startCue) playCue(result.startCue);
    setLog((previous) => [result.summary, ...previous].slice(0, 8));
  }, []);

  return { scene, log, run };
}
