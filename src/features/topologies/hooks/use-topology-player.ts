"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { play as playCue } from "cuelume";

import type { TopologyFrame } from "@/features/topologies/lib/topology-types";

/**
 * Budgets a whole operation into a classroom-sized moment and divides it
 * across the beats — a two-beat "add a device" pop feels instant, while a
 * six-beat packet animation actually reads as travel. See arrays-agent's
 * use-array-player.ts for the fuller rationale behind this shape.
 */
const TARGET_MS = 3_600;
const MIN_BEAT_MS = 120;
const MAX_BEAT_MS = 700;

export function beatDurationMs(frameCount: number): number {
  return Math.max(MIN_BEAT_MS, Math.min(MAX_BEAT_MS, Math.round(TARGET_MS / Math.max(frameCount, 1))));
}

export function useTopologyPlayer() {
  const [frame, setFrame] = useState<TopologyFrame | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSettleRef = useRef<((final: TopologyFrame) => void) | null>(null);
  const framesRef = useRef<TopologyFrame[]>([]);
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

  const finish = useCallback(
    (frames: TopologyFrame[]) => {
      stop();
      const final = frames[frames.length - 1];
      if (!final) return;
      setFrame(final);
      setProgress(null);
      playCue("bloom");
      onSettleRef.current?.(final);
      flushAfterSettle();
    },
    [flushAfterSettle, stop],
  );

  /**
   * Play a sequence. A new call interrupts whatever is running — a teacher's
   * next instruction should never queue behind an animation they have moved
   * on from — and the final frame is left on screen as the resting state.
   */
  const play = useCallback(
    (frames: TopologyFrame[], options: { speed?: "instant" | "normal" } = {}, onSettle?: (final: TopologyFrame) => void) => {
      stop();
      if (frames.length === 0) return;

      onSettleRef.current = onSettle ?? null;
      framesRef.current = frames;

      if (options.speed === "instant" || frames.length === 1) {
        finish(frames);
        return;
      }

      const beatMs = beatDurationMs(frames.length);
      let index = 0;
      setIsPlaying(true);

      const step = () => {
        const beat = frames[index];
        setFrame(beat);
        setProgress({ index: index + 1, total: frames.length });

        index++;
        if (index >= frames.length) {
          playCue("bloom");
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

  const controls = useMemo(
    () => ({ play, skip, stop, clear, afterSettle }),
    [play, skip, stop, clear, afterSettle],
  );

  return { frame, isPlaying, progress, controls };
}
