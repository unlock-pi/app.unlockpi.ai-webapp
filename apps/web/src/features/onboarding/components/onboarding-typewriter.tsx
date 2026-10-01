"use client";

import { useEffect, useRef, useState } from "react";

type TypewriterRevealProps = {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
};

/**
 * Types `text` out one character at a time and fires `onComplete` exactly
 * once, when done. Deliberately separate from the shared `Typewriter`
 * component (@/components/typewriter-text) — that one has no completion
 * signal and keeps blinking its cursor forever, both wrong for gating a
 * button on "has this actually been read yet".
 */
export function TypewriterReveal({
  text,
  speed = 18,
  onComplete,
  className,
}: TypewriterRevealProps) {
  const [length, setLength] = useState(0);
  const hasCompletedRef = useRef(false);

  // No effect resets `length` when `text` changes — every call site keys
  // this component on the step's title, so a new step remounts it fresh
  // instead of needing to reset existing state.
  useEffect(() => {
    if (length >= text.length) {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const timeout = setTimeout(() => setLength((previous) => previous + 1), speed);
    return () => clearTimeout(timeout);
  }, [length, text, speed, onComplete]);

  const isDone = length >= text.length;

  return (
    <span className={className}>
      {text.slice(0, length)}
      {!isDone ? (
        <span aria-hidden="true" className="animate-pulse">
          ▍
        </span>
      ) : null}
    </span>
  );
}
