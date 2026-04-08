"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const THINKING_LINES = [
  "Structuring the response so it lands clearly",
  "Shaping the board into something easier to scan",
  "Pulling the strongest frame for this explanation",
  "Organizing the answer before it appears on screen",
  "Tuning the format so the next view feels cleaner",
  "Laying out the content in a more visual way",
];

interface TalkThinkingOverlayProps {
  visible: boolean;
}

export function TalkThinkingOverlay({ visible }: TalkThinkingOverlayProps) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    if (!visible) {
      setLineIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLineIndex((current) => (current + 1) % THINKING_LINES.length);
    }, 1900);

    return () => window.clearInterval(interval);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none absolute left-0 right-0 top-5 z-10 flex justify-center px-4"
        >
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-black/45 shadow-[0_20px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-red-200/85">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400" />
                </span>
                Live Processing
              </div>
              <div className="text-xs text-gray-400">thinking in the background</div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold tracking-[-0.02em] text-white">Give me a second</p>
                  <p className="mt-1 text-sm leading-6 text-gray-300">
                    I am shaping the next response so it feels more polished than a raw dump.
                  </p>
                </div>

                <div className="flex h-10 items-end gap-1.5">
                  {[0, 1, 2, 3].map((bar) => (
                    <motion.span
                      key={bar}
                      animate={{ height: ["20%", "100%", "35%", "75%"] }}
                      transition={{
                        duration: 1.25,
                        repeat: Infinity,
                        delay: bar * 0.12,
                        ease: "easeInOut",
                      }}
                      className="w-1.5 rounded-full bg-gradient-to-t from-red-600 via-red-400 to-orange-200"
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Current step</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={lineIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 text-sm text-gray-100"
                  >
                    {THINKING_LINES[lineIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="h-px bg-gradient-to-r from-transparent via-red-400/90 to-transparent"
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
