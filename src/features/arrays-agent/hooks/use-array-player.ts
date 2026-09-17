"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { play as playCue } from "cuelume";

import type { ArrayFrame } from "@/features/arrays-agent/lib/array-types";

/**
 * Total wall-clock time one operation should take, whatever its length.
 *
 * A four-element insert is ~6 beats and a quicksort on twelve is well over a
 * hundred; pacing both at a fixed per-beat interval would make one feel
 * sluggish and the other run for minutes. Budgeting the whole operation and
 * dividing keeps every animation classroom-sized.
 */
const TARGET_DURATION_MS = 9_000;
const MIN_BEAT_MS = 90;
const MAX_BEAT_MS = 650;

export type ArrayPlayerView = ArrayFrame & { isPlaying: boolean };

export function useArrayPlayer() {
  const [frame, setFrame] = useState<ArrayFrame | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSettleRef = useRef<((final: ArrayFrame) => void) | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => stop, [stop]);

  /**
   * Play a sequence. A new call interrupts whatever is running — a teacher's
   * next instruction should never queue behind an animation they have moved on
   * from — and the final frame is left on screen as the resting state.
   */
  const play = useCallback(
    (frames: ArrayFrame[], onSettle?: (final: ArrayFrame) => void) => {
      stop();
      if (frames.length === 0) return;

      onSettleRef.current = onSettle ?? null;
      const beatMs = Math.max(
        MIN_BEAT_MS,
        Math.min(MAX_BEAT_MS, Math.round(TARGET_DURATION_MS / frames.length)),
      );
      // Cues are per-beat at human speed but would machine-gun during a long
      // sort, so fast playback only sounds the moments that matter.
      const audible = beatMs >= 280;

      let index = 0;
      setIsPlaying(true);

      const step = () => {
        const beat = frames[index];
        setFrame(beat);

        if (beat.found !== undefined) playCue("success");
        else if (audible) playCue("tick");

        index++;
        if (index >= frames.length) {
          playCue("bloom");
          setIsPlaying(false);
          timerRef.current = null;
          onSettleRef.current?.(beat);
          return;
        }
        timerRef.current = setTimeout(step, beatMs);
      };

      step();
    },
    [stop],
  );

  /** Jump straight to the end — for "skip the animation" or a rapid follow-up. */
  const settle = useCallback(
    (frames: ArrayFrame[]) => {
      stop();
      const final = frames[frames.length - 1];
      if (final) {
        setFrame(final);
        onSettleRef.current?.(final);
      }
    },
    [stop],
  );

  const clear = useCallback(() => {
    stop();
    setFrame(null);
  }, [stop]);

  /**
   * Controls are kept separate from `current`/`isPlaying` and memoized on
   * their own. The agent's tool context closes over the controls; bundling
   * them with the per-beat state would give the context a new identity on
   * every frame and rebuild all 41 tools dozens of times per animation.
   */
  const controls = useMemo(
    () => ({ play, settle, stop, clear }),
    [play, settle, stop, clear],
  );

  return { frame, isPlaying, controls };
}
