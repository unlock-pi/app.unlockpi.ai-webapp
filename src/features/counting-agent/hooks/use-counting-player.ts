"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { play as playCue } from "cuelume";

import { beatDurationMs } from "@/features/arrays-agent/hooks/use-array-player";
import type { AnimationSpeed, CountingFrame } from "@/features/counting-agent/lib/counting-types";

/**
 * Beat-by-beat player for the counting strip, mirroring `use-array-player.ts`.
 * `beatDurationMs` is reused directly from the arrays agent's player — it is
 * pure pacing math with no array-specific types in its signature. Most
 * counting operations carry a single frame (a declarative state change, not
 * a multi-step shift), so this mostly resolves instantly; the machinery
 * stays in place so slow-mode narration and replay work the same way.
 */
export function useCountingPlayer() {
  const [frame, setFrame] = useState<CountingFrame | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSettleRef = useRef<((final: CountingFrame) => void) | null>(null);
  const framesRef = useRef<CountingFrame[]>([]);
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
    (frames: CountingFrame[]) => {
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

  const play = useCallback(
    (
      frames: CountingFrame[],
      options: { speed?: AnimationSpeed } = {},
      onSettle?: (final: CountingFrame) => void,
    ) => {
      stop();
      if (frames.length === 0) return;

      onSettleRef.current = onSettle ?? null;
      framesRef.current = frames;
      const speed = options.speed ?? "normal";

      if (speed === "instant" || frames.length === 1) {
        finish(frames);
        return;
      }

      const beatMs = beatDurationMs(speed, frames.length);
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
