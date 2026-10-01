"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

const TYPE_MS = 32;
const DELETE_MS = 18;
const PAUSE_MS = 1500;

/**
 * Typewriter-style placeholder that cycles through example prompts. Rendered
 * as an absolutely positioned overlay above the real textarea — the actual
 * `placeholder` attribute stays empty so this doesn't double up with it.
 */
export function AnimatedPlaceholder({
  phrases,
  visible,
}: {
  phrases: readonly string[];
  visible: boolean;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!visible || phrases.length === 0) return;

    const currentPhrase = phrases[phraseIndex % phrases.length];
    const atFullPhrase = text === currentPhrase;
    const atEmpty = text === "";

    if (!isDeleting && atFullPhrase) {
      const timeout = setTimeout(() => setIsDeleting(true), PAUSE_MS);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && atEmpty) {
      setIsDeleting(false);
      setPhraseIndex((index) => (index + 1) % phrases.length);
      return;
    }

    const timeout = setTimeout(
      () => {
        setText(
          isDeleting
            ? currentPhrase.slice(0, text.length - 1)
            : currentPhrase.slice(0, text.length + 1),
        );
      },
      isDeleting ? DELETE_MS : TYPE_MS,
    );
    return () => clearTimeout(timeout);
  }, [visible, phrases, phraseIndex, text, isDeleting]);

  if (!visible) return null;

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-3 select-none text-sm text-muted-foreground/70"
    >
      {text}
      <motion.span
        className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-muted-foreground/70 align-middle"
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
      />
    </span>
  );
}
