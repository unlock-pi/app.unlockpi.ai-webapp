"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { XIcon } from "lucide-react";

import type { ArraysAgentOverlay } from "@/features/arrays-agent/hooks/use-arrays-voice-agent";
import { cn } from "@/lib/utils";

type Props = {
  overlays: ArraysAgentOverlay[];
  onDismiss: (id: string) => void;
  className?: string;
};

export function ArraysAgentOverlays({ overlays, onDismiss, className }: Props) {
  if (overlays.length === 0) return null;

  return (
    <div className={cn("grid gap-3", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        {overlays.map((overlay) => (
          <motion.div
            key={overlay.id}
            layout
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative rounded-xl border border-border/70 bg-card/80 p-4 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => onDismiss(overlay.id)}
              aria-label="Dismiss"
              className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
            <OverlayBody overlay={overlay} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function OverlayBody({ overlay }: { overlay: ArraysAgentOverlay }) {
  switch (overlay.kind) {
    case "explanation":
      return (
        <>
          <Heading>{overlay.title}</Heading>
          <p className="text-sm leading-relaxed text-muted-foreground">{overlay.content}</p>
        </>
      );

    case "complexity":
      return (
        <>
          <Heading>{overlay.operation.replace(/_/g, " ")}</Heading>
          <div className="flex flex-wrap gap-2 pb-2">
            <Stat label="Time" value={overlay.complexity.time} />
            <Stat label="Space" value={overlay.complexity.space} />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {overlay.complexity.reason}
          </p>
        </>
      );

    case "steps":
      return (
        <>
          <Heading>{overlay.title}</Heading>
          <ol className="max-h-64 overflow-y-auto pr-1">
            {overlay.steps.map((step, index) => (
              <li
                key={`${index}-${step}`}
                className="flex gap-2.5 py-1 text-sm text-muted-foreground"
              >
                <span className="w-6 shrink-0 text-right tabular-nums text-xs text-muted-foreground/60">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </>
      );

    case "comparison":
      return (
        <>
          <Heading>{overlay.title}</Heading>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-1 pr-3 text-left font-medium">Algorithm</th>
                  <th className="py-1 pr-3 text-right font-medium">Compares</th>
                  <th className="py-1 pr-3 text-right font-medium">Moves</th>
                  <th className="py-1 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {overlay.rows.map((row) => (
                  <tr key={row.algorithm} className="border-t border-border/50">
                    <td className="py-1.5 pr-3 capitalize text-foreground">
                      {row.algorithm.replace(/_/g, " ")}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">
                      {row.comparisons}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">
                      {row.swaps}
                    </td>
                    <td className="py-1.5 font-mono text-xs text-muted-foreground">
                      {row.complexity.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );

    case "quiz":
      return <QuizCard overlay={overlay} />;
  }
}

/**
 * The answer stays hidden until the teacher asks for it — revealing it with
 * the question would defeat the point of asking the class.
 */
function QuizCard({ overlay }: { overlay: Extract<ArraysAgentOverlay, { kind: "quiz" }> }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <>
      <Heading>Question for the class</Heading>
      <p className="text-sm leading-relaxed text-foreground">{overlay.question}</p>

      {overlay.choices?.length ? (
        <ul className="grid gap-1.5 pt-2">
          {overlay.choices.map((choice, index) => (
            <li
              key={choice}
              className="rounded-lg border border-border/60 px-2.5 py-1.5 text-sm text-muted-foreground"
            >
              <span className="mr-2 font-medium text-foreground/70">
                {String.fromCharCode(65 + index)}
              </span>
              {choice}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="pt-3">
        {revealed ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-sm text-emerald-700 dark:text-emerald-400"
          >
            {overlay.answer}
          </motion.p>
        ) : (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Reveal answer
          </button>
        )}
      </div>
    </>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="pb-1.5 pr-6 text-sm font-semibold capitalize tracking-tight text-foreground">
      {children}
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground">{value}</span>
    </span>
  );
}
