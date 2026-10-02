"use client";

import { Button } from "./button";
import { cn } from "./utils";

export type ExecutionControlsProps = {
  disabled?: boolean;
  terminal?: boolean;
  status?: string;
  onReset: () => void;
  onStep: () => void;
  onTogglePlayback?: () => void;
  playing?: boolean;
  ariaLabel?: string;
  className?: string;
};

/** Shared playback controls; domains provide their own transition semantics. */
export function ExecutionControls({
  disabled = false,
  terminal = false,
  status,
  onReset,
  onStep,
  onTogglePlayback,
  playing = false,
  ariaLabel = "Execution controls",
  className,
}: ExecutionControlsProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label={ariaLabel}
    >
      {status ? (
        <span
          role="status"
          className="mr-1 min-w-16 rounded-full bg-muted px-2.5 py-1 text-center text-[11px] font-semibold capitalize text-muted-foreground"
        >
          {status}
        </span>
      ) : null}
      {onTogglePlayback ? (
        <Button type="button" size="sm" variant="outline" disabled={disabled || (terminal && !playing)} onClick={(event) => {
          event.stopPropagation();
          onTogglePlayback();
        }}>
          {playing ? "Pause" : "Run"}
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={disabled || terminal}
        onClick={(event) => {
          event.stopPropagation();
          onStep();
        }}
      >
        Step
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={(event) => {
          event.stopPropagation();
          onReset();
        }}
      >
        Reset
      </Button>
    </div>
  );
}
