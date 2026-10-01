"use client";

import { useEffect, useRef } from "react";

type AmbientNodes = {
  context: AudioContext;
  master: GainNode;
  cleanup: () => void;
};

function createAmbientNodes(context: AudioContext): AmbientNodes {
  const master = context.createGain();
  const filter = context.createBiquadFilter();
  const lfo = context.createOscillator();
  const lfoDepth = context.createGain();

  const droneA = context.createOscillator();
  const droneB = context.createOscillator();
  const shimmer = context.createOscillator();

  const gainA = context.createGain();
  const gainB = context.createGain();
  const gainShimmer = context.createGain();

  master.gain.value = 0;
  filter.type = "lowpass";
  filter.frequency.value = 760;
  filter.Q.value = 0.8;

  droneA.type = "sine";
  droneA.frequency.value = 196;
  gainA.gain.value = 0.045;

  droneB.type = "triangle";
  droneB.frequency.value = 246.94;
  gainB.gain.value = 0.025;

  shimmer.type = "sine";
  shimmer.frequency.value = 392;
  gainShimmer.gain.value = 0.008;

  lfo.type = "sine";
  lfo.frequency.value = 0.11;
  lfoDepth.gain.value = 150;

  droneA.connect(gainA);
  droneB.connect(gainB);
  shimmer.connect(gainShimmer);

  gainA.connect(filter);
  gainB.connect(filter);
  gainShimmer.connect(filter);
  filter.connect(master);
  master.connect(context.destination);

  lfo.connect(lfoDepth);
  lfoDepth.connect(filter.frequency);

  droneA.start();
  droneB.start();
  shimmer.start();
  lfo.start();

  return {
    context,
    master,
    cleanup: () => {
      droneA.stop();
      droneB.stop();
      shimmer.stop();
      lfo.stop();
      master.disconnect();
      filter.disconnect();
      gainA.disconnect();
      gainB.disconnect();
      gainShimmer.disconnect();
      lfoDepth.disconnect();
    },
  };
}

export function useThinkingAmbience(enabled: boolean) {
  const nodesRef = useRef<AmbientNodes | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const AudioContextClass =
      window.AudioContext ||
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    if (!nodesRef.current) {
      const context = new AudioContextClass();
      nodesRef.current = createAmbientNodes(context);
    }

    const nodes = nodesRef.current;
    if (!nodes) return;

    void nodes.context.resume().catch(() => {});

    const now = nodes.context.currentTime;
    nodes.master.gain.cancelScheduledValues(now);
    nodes.master.gain.linearRampToValueAtTime(enabled ? 0.055 : 0, now + 0.35);
  }, [enabled]);

  useEffect(() => {
    return () => {
      const nodes = nodesRef.current;
      if (!nodes) return;

      nodes.cleanup();
      void nodes.context.close().catch(() => {});
      nodesRef.current = null;
    };
  }, []);
}
