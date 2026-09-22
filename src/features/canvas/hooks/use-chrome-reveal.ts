"use client";

import { useEffect, useState } from "react";

type UseChromeRevealOptions = {
  /** Height, in px, of the band at the top and at the bottom that reveals the chrome. */
  hotzone?: number;
  /** How long the chrome lingers after the pointer leaves it. */
  lingerMs?: number;
  /** Show the chrome for a moment on mount, so a teacher learns it exists. */
  introMs?: number;
  /** Keep the chrome up regardless of the pointer — e.g. while connecting. */
  hold?: boolean;
};

/**
 * ONE visibility state for all of the presenter's chrome — title, end-class
 * button, dock and footer appear and disappear together.
 *
 * Same rules as `useEdgeReveal`: only the top or bottom edge reveals anything
 * (the middle of the frame stays quiet), and hovering any piece of chrome pins
 * it. There is deliberately no second tier: when the dock and the footer had
 * separate zones, reaching for the dock crossed into the footer's zone, the
 * dock moved to make room, and it slid out from under the pointer.
 */
export function useChromeReveal({
  hotzone = 140,
  lingerMs = 1500,
  introMs = 2500,
  hold = false,
}: UseChromeRevealOptions = {}) {
  const [atEdge, setAtEdge] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [intro, setIntro] = useState(introMs > 0);

  useEffect(() => {
    if (introMs <= 0) return;
    const timer = setTimeout(() => setIntro(false), introMs);
    return () => clearTimeout(timer);
  }, [introMs]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      setAtEdge(
        event.clientY <= hotzone || event.clientY >= window.innerHeight - hotzone,
      );
    };
    const handleLeave = () => setAtEdge(false);

    window.addEventListener("pointermove", handleMove);
    document.documentElement.addEventListener("pointerleave", handleLeave);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
    };
  }, [hotzone]);

  const visible = useLingered(intro || hold || atEdge || pinned, lingerMs);

  return {
    visible,
    /** Spread onto every piece of chrome: hovering any of them pins all of it. */
    pinHandlers: {
      onPointerEnter: () => setPinned(true),
      onPointerLeave: () => setPinned(false),
      onFocus: () => setPinned(true),
      onBlur: () => setPinned(false),
    },
  };
}

/** On immediately; off only after `lingerMs` of staying inactive. */
function useLingered(active: boolean, lingerMs: number) {
  const [wasActive, setWasActive] = useState(active);
  const [lingering, setLingering] = useState(false);
  // Bumped on every active→inactive edge, so leaving again restarts the timer.
  const [leaves, setLeaves] = useState(0);

  // Adjusting state while rendering on a prop change — React's recommended
  // alternative to a setState-in-effect.
  if (active !== wasActive) {
    setWasActive(active);
    if (!active) {
      setLingering(true);
      setLeaves((count) => count + 1);
    }
  }

  useEffect(() => {
    if (!lingering) return;
    const timer = setTimeout(() => setLingering(false), lingerMs);
    return () => clearTimeout(timer);
  }, [leaves, lingering, lingerMs]);

  return active || lingering;
}
