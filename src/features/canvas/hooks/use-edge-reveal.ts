"use client";

import { useEffect, useRef, useState } from "react";

type UseEdgeRevealOptions = {
  /**
   * Height of the mouse-hover hotzone at each edge, in px. Header shows only
   * while the pointer is inside the top band; footer only inside the bottom
   * band. Hovering the middle of the page does nothing — that's what makes
   * the whole viewport usable for presenting.
   */
  hotzone?: number;
  /**
   * How long the chrome lingers after the pointer leaves the hotzone (or the
   * bar) before it auto-hides. Prevents the chrome from vanishing the
   * instant you nudge the mouse away.
   */
  lingerMs?: number;
};

/**
 * Edge-only chrome reveal. Header and footer are visible whenever the pointer
 * sits in EITHER edge hotzone (top or bottom) — the two bars are kept in sync
 * so hovering the top also brings the footer in, and vice versa. Hovering the
 * bar itself pins both while the pointer stays on it, so a slow move to a
 * button doesn't cause them to vanish under you.
 *
 * There is no idle timer and no "any mouse move reveals": general movement
 * across the middle of the frame stays quiet.
 */
export function useEdgeReveal({
  hotzone = 96,
  lingerMs = 3000,
}: UseEdgeRevealOptions = {}) {
  const [topEdge, setTopEdge] = useState(false);
  const [bottomEdge, setBottomEdge] = useState(false);
  const [pinned, setPinned] = useState(false);
  // `visible` is the delayed value — flips on immediately, flips off after
  // `lingerMs` of no hover/edge activity.
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setTopEdge(event.clientY <= hotzone);
      setBottomEdge(event.clientY >= window.innerHeight - hotzone);
    };

    // Hide both when the mouse leaves the window entirely — the linger timer
    // will still run so the chrome doesn't snap away instantly.
    const handleMouseLeave = () => {
      setTopEdge(false);
      setBottomEdge(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [hotzone]);

  // Either edge (or a hovered bar) reveals BOTH bars — they stay in sync so
  // top and bottom appear and disappear together. When active drops, wait
  // `lingerMs` before actually hiding, so a quick move away doesn't yank the
  // chrome out from under the cursor.
  const active = topEdge || bottomEdge || pinned;
  useEffect(() => {
    if (active) {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      // FIX: `setVisible(true)` was being called twice in a row, which caused a React state update warning. Now it only sets visible once when active is true.
      setVisible(true);
      return;
    }
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, lingerMs);
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [active, lingerMs]);

  const hoverHandlers = {
    onPointerEnter: () => setPinned(true),
    onPointerLeave: () => setPinned(false),
    onFocus: () => setPinned(true),
    onBlur: () => setPinned(false),
  };

  return {
    top: visible,
    bottom: visible,
    /** Attach to either bar — both share the same pin so either one keeps
     * the whole chrome visible. */
    topHoverHandlers: hoverHandlers,
    bottomHoverHandlers: hoverHandlers,
  };
}
