"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import {
  AlertTriangleIcon,
  BrainIcon,
  EarIcon,
  MessageSquareIcon,
  PlugIcon,
  WrenchIcon,
  XIcon,
} from "lucide-react";

import {
  describeLatency,
  latencyTone,
  type AgentEvent,
  type AgentLatency,
} from "@/features/arrays-agent/lib/agent-activity";
import { cn } from "@/lib/utils";

type Props = {
  events: AgentEvent[];
  latency: AgentLatency;
  status: string;
  isConnected: boolean;
  isUserSpeaking: boolean;
  isResponding: boolean;
  isAnimating: boolean;
  /** The beat playing right now, and how far through it is. */
  animationNote?: string;
  animationProgress?: { index: number; total: number } | null;
  animationSpeed?: string;
  onSkipAnimation?: () => void;
  onClose: () => void;
};

/**
 * What the agent is doing, in the open.
 *
 * A voice agent that does nothing looks identical whether it never heard you,
 * heard you and chose no tool, or chose a tool that refused. This panel makes
 * those three cases visibly different — which is the difference between
 * "the AI is broken" and a fixable bug report.
 */
export function ArraysAgentActivityPanel({
  events,
  latency,
  status,
  isConnected,
  isUserSpeaking,
  isResponding,
  isAnimating,
  animationNote,
  animationProgress,
  animationSpeed,
  onSkipAnimation,
  onClose,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [events]);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-l border-border bg-card/70 backdrop-blur-md">
      <header className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Agent activity
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide agent activity"
          className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      </header>

      <LiveState
        status={status}
        isConnected={isConnected}
        isUserSpeaking={isUserSpeaking}
        isResponding={isResponding}
        isAnimating={isAnimating}
      />

      {isAnimating ? (
        <AnimationStep
          note={animationNote}
          progress={animationProgress}
          speed={animationSpeed}
          onSkip={onSkipAnimation}
        />
      ) : null}

      <Metrics latency={latency} />

      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
        {events.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {isConnected
              ? "Listening. Say something and it will appear here."
              : "Start the agent to see what it hears and does."}
          </p>
        ) : (
          <ol className="grid gap-1.5">
            <AnimatePresence initial={false}>
              {events.map((event, index) => (
                <motion.li
                  key={`${event.at}-${index}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <EventRow event={event} />
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        )}
      </div>
    </aside>
  );
}

/**
 * The one thing a teacher actually needs mid-class: is it hearing me right
 * now? Everything else on this panel is for after something went wrong.
 */
function LiveState({
  status,
  isConnected,
  isUserSpeaking,
  isResponding,
  isAnimating,
}: Pick<Props, "status" | "isConnected" | "isUserSpeaking" | "isResponding" | "isAnimating">) {
  const state = !isConnected
    ? { label: status === "connecting" ? "Connecting…" : "Not connected", tone: "idle" as const }
    : isUserSpeaking
      ? { label: "Hearing you", tone: "live" as const }
      : isResponding
        ? { label: "Responding", tone: "busy" as const }
        : isAnimating
          ? { label: "Animating the board", tone: "busy" as const }
          : { label: "Listening", tone: "ready" as const };

  return (
    <div className="flex items-center gap-2.5 border-b border-border px-3 py-3">
      <span
        className={cn(
          "size-2.5 shrink-0 rounded-full",
          // Never `primary` here: this theme's primary is red, which made a
          // healthy "Listening" look like an error.
          state.tone === "live" && "animate-pulse bg-emerald-500",
          state.tone === "ready" && "bg-emerald-500",
          state.tone === "busy" && "animate-pulse bg-amber-500",
          state.tone === "idle" && "bg-muted-foreground/50",
        )}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{state.label}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {isConnected ? "Microphone is open" : "Microphone is closed"}
        </p>
      </div>
    </div>
  );
}

/**
 * What the animation is doing right now. In slow mode this is the line the
 * class is reading on the board, repeated here with a way out of a long sort.
 */
function AnimationStep({
  note,
  progress,
  speed,
  onSkip,
}: {
  note?: string;
  progress?: { index: number; total: number } | null;
  speed?: string;
  onSkip?: () => void;
}) {
  return (
    <div className="border-b border-border bg-amber-500/5 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {speed === "slow" ? "Step by step" : "Animating"}
          {progress ? ` · ${progress.index}/${progress.total}` : ""}
        </p>
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Skip
          </button>
        ) : null}
      </div>
      {note ? (
        <p className="pt-0.5 text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function Metrics({ latency }: { latency: AgentLatency }) {
  const tone = latencyTone(latency.responseMs);

  return (
    <div className="grid grid-cols-3 gap-px border-b border-border bg-border">
      <Metric
        label="Reply"
        value={describeLatency(latency.responseMs)}
        hint="Time from you finishing to its first word or action"
        tone={tone}
      />
      <Metric
        label="Average"
        value={describeLatency(latency.averageResponseMs)}
        hint="Mean over this session"
      />
      <Metric
        label="Tools"
        value={
          latency.toolFailures > 0
            ? `${latency.toolCalls} · ${latency.toolFailures}✕`
            : String(latency.toolCalls)
        }
        hint="Tool calls, and how many were refused"
        tone={latency.toolFailures > 0 ? "warn" : undefined}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "good" | "warn" | "bad" | "idle";
}) {
  return (
    <div className="bg-card px-2 py-2" title={hint}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-mono text-sm tabular-nums",
          tone === "good" && "text-emerald-600 dark:text-emerald-400",
          tone === "warn" && "text-amber-600 dark:text-amber-400",
          tone === "bad" && "text-destructive",
          (!tone || tone === "idle") && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EventRow({ event }: { event: AgentEvent }) {
  const time = new Date(event.at).toLocaleTimeString([], {
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
  });

  // `[overflow-wrap:anywhere]` because tool results can contain long unbroken
  // strings, which otherwise pushed the whole panel into a sideways scroll.
  const base =
    "flex min-w-0 gap-2 rounded-lg px-2 py-1.5 text-xs leading-relaxed [overflow-wrap:anywhere]";

  if (event.kind === "heard") {
    return (
      <div className={cn(base, "bg-emerald-500/10")}>
        <EarIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span className="min-w-0 text-foreground">
          <span className="text-muted-foreground">heard </span>
          &ldquo;{event.text}&rdquo;
        </span>
      </div>
    );
  }

  if (event.kind === "said") {
    return (
      <div className={cn(base, "bg-muted/50")}>
        <MessageSquareIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 text-muted-foreground">{event.text}</span>
      </div>
    );
  }

  if (event.kind === "tool") {
    return (
      <div className={cn(base, event.ok ? "bg-muted/60" : "bg-destructive/10")}>
        <WrenchIcon
          className={cn(
            "mt-0.5 size-3.5 shrink-0",
            event.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
          )}
        />
        <span className="min-w-0">
          <span className="font-mono font-medium text-foreground">{event.name}</span>
          {event.args ? (
            <span className="font-mono text-muted-foreground"> {event.args}</span>
          ) : null}
          <span className="ml-1 font-mono text-[10px] text-muted-foreground">
            {Math.round(event.durationMs)}ms
          </span>
          {event.summary ? (
            <span
              title={event.summary}
              className={cn(
                "line-clamp-3 block",
                event.ok ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {event.ok ? "" : "refused: "}
              {event.summary}
            </span>
          ) : null}
        </span>
      </div>
    );
  }

  if (event.kind === "thinking") {
    return (
      <div className={cn(base, "text-muted-foreground")}>
        <BrainIcon className="mt-0.5 size-3.5 shrink-0" />
        <span>
          started replying after{" "}
          <span className="font-mono">{describeLatency(event.latencyMs)}</span>
        </span>
      </div>
    );
  }

  if (event.kind === "error") {
    return (
      <div className={cn(base, "bg-destructive/10 text-destructive")}>
        <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
        <span className="min-w-0">{event.text}</span>
      </div>
    );
  }

  return (
    <div className={cn(base, "text-muted-foreground")}>
      <PlugIcon className="mt-0.5 size-3.5 shrink-0" />
      <span>
        <span className="font-mono text-[10px]">{time}</span> {event.text}
      </span>
    </div>
  );
}
