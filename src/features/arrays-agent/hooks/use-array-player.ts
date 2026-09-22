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
/**
 * Long enough for a cell's slide to finish before the next beat starts — a
 * beat that begins mid-motion is two things moving at once.
 */
const NORMAL_MAX_BEAT_MS = 850;

/**
 * "Slow" gives each beat a readable amount of time rather than dividing a
 * budget. It still has an outer limit: at a flat 1.1s a hundred-beat quicksort
 * would run for two minutes, which is a different kind of unusable. Very long
 * runs tighten towards the floor instead.
 */
const SLOW_BEAT_MS = 1_100;
const SLOW_MIN_BEAT_MS = 600;
const SLOW_MAX_TOTAL_MS = 75_000;

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
  /**
   * Work that must wait for the board to finish — the explanation card, for
   * one. Showing it while cells are still moving splits the class's attention
   * between two things at once.
   */
  const afterSettleRef = useRef<Array<() => void>>([]);

  const flushAfterSettle = useCallback(() => {
    const pending = afterSettleRef.current;
    afterSettleRef.current = [];
    pending.forEach((run) => run());
  }, []);

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
      playCue(frames.some((beat) => beat.found !== undefined) ? "success" : "bloom");
      onSettleRef.current?.(final);
      flushAfterSettle();
    },
    [flushAfterSettle, stop],
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
      // One sound per operation, at the end — per-beat ticks were one more
      // thing competing with the board for attention.
      const cue = frames.some((beat) => beat.found !== undefined) ? "success" : "bloom";

      let index = 0;
      setIsPlaying(true);

      const step = () => {
        const beat = frames[index];
        setFrame(beat);
        setProgress({ index: index + 1, total: frames.length });

        index++;
        if (index >= frames.length) {
          playCue(cue);
          setIsPlaying(false);
          setProgress(null);
          timerRef.current = null;
          onSettleRef.current?.(beat);
          flushAfterSettle();
          return;
        }
        timerRef.current = setTimeout(step, beatMs);
      };

      step();
    },
    [finish, flushAfterSettle, stop],
  );

  /** Run `task` once the board is at rest — now, if nothing is playing. */
  const afterSettle = useCallback((task: () => void) => {
    if (timerRef.current) afterSettleRef.current.push(task);
    else task();
  }, []);

  /** Jump to the end of whatever is playing — "skip it", or a rapid follow-up. */
  const skip = useCallback(() => {
    if (framesRef.current.length) finish(framesRef.current);
  }, [finish]);

  const clear = useCallback(() => {
    stop();
    afterSettleRef.current = [];
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
    () => ({ play, skip, stop, clear, afterSettle }),
    [play, skip, stop, clear, afterSettle],
  );

  return { frame, isPlaying, progress, controls };
}
