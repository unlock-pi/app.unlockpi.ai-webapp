"use client";

/**
 * Steps through a `CircuitFrame[]` on a timer — the circuit equivalent of
 * `use-array-player.ts`. Same shape, same reasoning, trimmed down: circuit
 * demos here run 2-5 beats (there's no hundred-step quicksort case to guard
 * against), so the pacing math is a flat interval instead of a budget
 * that compresses for long sequences.
 *
 * Sound cues, same rule as the array player: ONE cue per sequence, not one
 * per beat — a tick on every wire lighting up was noise before it was
 * teaching. `startCue` is the one exception, for a genuine physical action
 * (flipping a switch) that happens the instant `play()` is called, before
 * any beat has even been drawn.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { play as playCue, type SoundName } from "cuelume";

import type { CircuitComponent, CircuitFrame } from "@/components/data-structure/circuit";

/** Time each beat stays on screen before the next one plays. */
const BEAT_MS = 900;

/** True if the settled picture has anything actually lit/asserted — the moment worth a brighter "it worked" cue instead of a plain "it settled" one. */
function endsLit(final: CircuitFrame): boolean {
  return final.components.some((component: CircuitComponent) => {
    if (component.kind !== "led" && component.kind !== "bulb" && component.kind !== "value") {
      return false;
    }
    return component.state === "on" || component.state === "high";
  });
}

export function useCircuitPlayer() {
  const [frame, setFrame] = useState<CircuitFrame | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const framesRef = useRef<CircuitFrame[]>([]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => stop, [stop]);

  /** Show the end state immediately — used both by `skip()` and by the last beat of a normal play(). */
  const finish = useCallback(
    (frames: CircuitFrame[]) => {
      stop();
      const final = frames[frames.length - 1];
      if (!final) return;
      setFrame(final);
      playCue(endsLit(final) ? "success" : "bloom");
    },
    [stop],
  );

  /**
   * Play a sequence. A new call interrupts whatever is running, same rule as
   * the array player: the next command should never queue behind an
   * animation someone has already moved on from.
   */
  const play = useCallback(
    (frames: CircuitFrame[], options: { startCue?: SoundName } = {}) => {
      stop();
      if (frames.length === 0) return;

      if (options.startCue) playCue(options.startCue);

      framesRef.current = frames;
      let index = 0;
      setIsPlaying(true);

      const step = () => {
        const beat = frames[index];
        setFrame(beat);
        index++;
        if (index >= frames.length) {
          playCue(endsLit(beat) ? "success" : "bloom");
          setIsPlaying(false);
          timerRef.current = null;
          return;
        }
        timerRef.current = setTimeout(step, BEAT_MS);
      };

      step();
    },
    [stop],
  );

  const skip = useCallback(() => {
    if (framesRef.current.length) finish(framesRef.current);
  }, [finish]);

  const clear = useCallback(() => {
    stop();
    framesRef.current = [];
    setFrame(null);
  }, [stop]);

  const controls = useMemo(() => ({ play, skip, stop, clear }), [play, skip, stop, clear]);

  return { frame, isPlaying, controls };
}
