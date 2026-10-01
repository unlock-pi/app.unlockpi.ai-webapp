/**
 * Custom hook to extract real-time frequency data from a LiveKit audio track.
 * Returns normalized levels (0-1) suitable for driving the Matrix component in "vu" mode.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TrackSource =
  | MediaStreamTrack
  | {
      publication?: {
        track?: {
          mediaStreamTrack?: MediaStreamTrack;
        };
      };
      track?: {
        mediaStreamTrack?: MediaStreamTrack;
      };
    }
  | undefined;

type WindowWithWebkitAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function resolveMediaStreamTrack(trackSource: TrackSource): MediaStreamTrack | undefined {
  if (!trackSource) {
    return undefined;
  }

  if (trackSource instanceof MediaStreamTrack) {
    return trackSource;
  }

  return (
    trackSource.publication?.track?.mediaStreamTrack ?? trackSource.track?.mediaStreamTrack
  );
}

export function useAudioAnalyzer(trackSource: TrackSource, fftSize = 64): number[] {
  const binCount = fftSize / 2;
  const emptyData = useMemo(() => new Array(binCount).fill(0), [binCount]);
  const [data, setData] = useState<number[]>(emptyData);
  const rafRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamTrack = useMemo(() => resolveMediaStreamTrack(trackSource), [trackSource]);

  useEffect(() => {
    if (!mediaStreamTrack) {
      return;
    }

    const { AudioContext: BrowserAudioContext, webkitAudioContext } =
      window as WindowWithWebkitAudio;
    const AudioContextClass = BrowserAudioContext ?? webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();

    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    try {
      const source = audioContext.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const update = () => {
        const activeAnalyser = analyserRef.current;
        if (!activeAnalyser) {
          return;
        }

        activeAnalyser.getByteFrequencyData(dataArray);
        const normalized = Array.from(dataArray, (value) => value / 255);
        setData(normalized);
        rafRef.current = requestAnimationFrame(update);
      };

      update();

      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        source.disconnect();
        analyserRef.current = null;
        if (audioContext.state !== "closed") {
          audioContext.close().catch(() => {});
        }
      };
    } catch (error) {
      console.error("[useAudioAnalyzer] Setup failed:", error);
    }
  }, [fftSize, mediaStreamTrack]);

  return mediaStreamTrack ? data : emptyData;
}
