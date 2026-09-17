"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { play as playCue } from "cuelume";

import type { AnimationSpeed, ArrayFrame } from "@/features/arrays-agent/lib/array-types";

/**
 * "Normal" budgets the whole operation into a classroom-sized moment and
 * divides it across the beats. That suits a six-beat insert; it is what made a
 * hundred-beat quicksort flash past at the floor of 90ms per beat.
 */
const NORMAL_TARGET_MS = 12_000;
const NORMAL_MIN_BEAT_MS = 150;
const NORMAL_MAX_BEAT_MS = 650;

/**
 * "Slow" gives each beat a readable amount of time rather than dividing a
 * budget. It still has an outer limit: at a flat 1.1s a hundred-beat quicksort
 * would run for two minutes, which is a different kind of unusable. Very long
 * runs tighten towards the floor instead.
 */
const SLOW_BEAT_MS = 1_100;
const SLOW_MIN_BEAT_MS = 600;
const SLOW_MAX_TOTAL_MS = 75_000;

/** Below this, per-beat sound cues become a machine-gun rattle. */
const AUDIBLE_BEAT_MS = 280;

export function beatDurationMs(speed: AnimationSpeed, frameCount: number): number {
  if (speed === "instant") return 0;
  if (speed === "slow") {
    return Math.max(
      SLOW_MIN_BEAT_MS,
      Math.min(SLOW_BEAT_MS, Math.round(SLOW_MAX_TOTAL_MS / Math.max(frameCount, 1))),
    );
  }
  return Math.max(
    NORMAL_MIN_BEAT_MS,
    Math.min(NORMAL_MAX_BEAT_MS, Math.round(NORMAL_TARGET_MS / Math.max(frameCount, 1))),
  );
}

export function useArrayPlayer() {
  const [frame, setFrame] = useState<ArrayFrame | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  /** Which beat of how many — so the panel can show progress through a sort. */
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSettleRef = useRef<((final: ArrayFrame) => void) | null>(null);
  const framesRef = useRef<ArrayFrame[]>([]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => stop, [stop]);

  /** Show the end state now and tell the caller it has settled. */
  const finish = useCallback(
    (frames: ArrayFrame[]) => {
      stop();
      const final = frames[frames.length - 1];
      if (!final) return;
      setFrame(final);
      setProgress(null);
      playCue("bloom");
      onSettleRef.current?.(final);
    },
    [stop],
  );

  /**
   * Play a sequence. A new call interrupts whatever is running — a teacher's
   * next instruction should never queue behind an animation they have moved on
   * from — and the final frame is left on screen as the resting state.
   */
  const play = useCallback(
    (
      frames: ArrayFrame[],
      options: { speed?: AnimationSpeed } = {},
      onSettle?: (final: ArrayFrame) => void,
    ) => {
      stop();
      if (frames.length === 0) return;

      onSettleRef.current = onSettle ?? null;
      framesRef.current = frames;
      const speed = options.speed ?? "normal";

      if (speed === "instant") {
        finish(frames);
        return;
      }

      const beatMs = beatDurationMs(speed, frames.length);
      const audible = beatMs >= AUDIBLE_BEAT_MS;

      let index = 0;
      setIsPlaying(true);

      const step = () => {
        const beat = frames[index];
        setFrame(beat);
        setProgress({ index: index + 1, total: frames.length });

        if (beat.found !== undefined) playCue("success");
        else if (audible) playCue("tick");

        index++;
        if (index >= frames.length) {
          playCue("bloom");
          setIsPlaying(false);
          setProgress(null);
          timerRef.current = null;
          onSettleRef.current?.(beat);
          return;
        }
        timerRef.current = setTimeout(step, beatMs);
      };

      step();
    },
    [finish, stop],
  );

  /** Jump to the end of whatever is playing — "skip it", or a rapid follow-up. */
  const skip = useCallback(() => {
    if (framesRef.current.length) finish(framesRef.current);
  }, [finish]);

  const clear = useCallback(() => {
    stop();
    framesRef.current = [];
    setFrame(null);
    setProgress(null);
  }, [stop]);

  /**
   * Controls are kept separate from `frame`/`isPlaying`/`progress` and memoized
   * on their own. The agent's tool context closes over the controls; bundling
   * them with the per-beat state would give the context a new identity on
   * every frame and rebuild all the tools dozens of times per animation.
   */
  const controls = useMemo(
    () => ({ play, skip, stop, clear }),
    [play, skip, stop, clear],
  );

  return { frame, isPlaying, progress, controls };
}
