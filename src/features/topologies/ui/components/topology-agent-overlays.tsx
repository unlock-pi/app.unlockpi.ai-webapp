"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { XIcon } from "lucide-react";

import type { TopologyAgentOverlay } from "@/features/topologies/hooks/use-topology-voice-agent";
import { cn } from "@/lib/utils";

type Props = {
  overlays: TopologyAgentOverlay[];
  onDismiss: (id: string) => void;
  className?: string;
};

export function TopologyAgentOverlays({ overlays, onDismiss, className }: Props) {
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

function OverlayBody({ overlay }: { overlay: TopologyAgentOverlay }) {
  switch (overlay.kind) {
    case "explanation":
      return (
        <>
          <Heading>{overlay.title}</Heading>
          <p className="text-sm leading-relaxed text-muted-foreground">{overlay.content}</p>
        </>
      );

    case "legend":
      return (
        <>
          <Heading>{overlay.title}</Heading>
          <ul className="grid gap-1.5">
            {overlay.items.map((item) => (
              <li key={item.label} className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{item.label}</span> — {item.description}
              </li>
            ))}
          </ul>
        </>
      );

    case "quiz":
      return <QuizCard overlay={overlay} />;
  }
}

function QuizCard({ overlay }: { overlay: Extract<TopologyAgentOverlay, { kind: "quiz" }> }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <>
      <Heading>Question for the class</Heading>
      <p className="text-sm leading-relaxed text-foreground">{overlay.question}</p>

      {overlay.choices?.length ? (
        <ul className="grid gap-1.5 pt-2">
          {overlay.choices.map((choice, index) => (
            <li key={choice} className="rounded-lg border border-border/60 px-2.5 py-1.5 text-sm text-muted-foreground">
              <span className="mr-2 font-medium text-foreground/70">{String.fromCharCode(65 + index)}</span>
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
  return <p className="pb-1.5 pr-6 text-sm font-semibold capitalize tracking-tight text-foreground">{children}</p>;
}
