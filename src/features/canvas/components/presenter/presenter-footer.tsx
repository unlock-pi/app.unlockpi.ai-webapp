"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MaximizeIcon,
  MinimizeIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";

import Logo from "@/components/logo";
import { cn } from "@/lib/utils";

type Props = {
  frameNumber: number;
  frameCount: number;
  onPrevious: () => void;
  onNext: () => void;
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  className?: string;
};

/**
 * The status bar under the stage: who made it, where you are in the deck, and
 * how big it is drawn. Deliberately quiet — it is chrome around the lesson.
 */
export function PresenterFooter({
  frameNumber,
  frameCount,
  onPrevious,
  onNext,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  canZoomIn,
  canZoomOut,
  isFullscreen,
  onToggleFullscreen,
  className,
}: Props) {
  return (
    <footer
      className={cn(
        "flex h-12 shrink-0 items-center justify-between gap-4 border-t border-border bg-background px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
          UnlockPi
        </span>
        <Logo isLink={false} width={16} height={16} />
      </div>

      <div className="flex items-center gap-1 text-sm">
        <FooterButton
          label="Previous frame"
          onClick={onPrevious}
          disabled={frameNumber <= 1}
        >
          <ChevronLeftIcon className="size-4" />
        </FooterButton>
        <span className="min-w-6 text-center tabular-nums text-foreground">
          {frameNumber}
        </span>
        <span aria-hidden="true" className="text-border">
          |
        </span>
        <span className="min-w-6 text-center tabular-nums text-muted-foreground">
          {frameCount}
        </span>
        <FooterButton
          label="Next frame"
          onClick={onNext}
          disabled={frameNumber >= frameCount}
        >
          <ChevronRightIcon className="size-4" />
        </FooterButton>
      </div>

      <div className="flex items-center gap-1">
        <FooterButton label="Zoom in" onClick={onZoomIn} disabled={!canZoomIn}>
          <ZoomInIcon className="size-4" />
        </FooterButton>
        <button
          type="button"
          onClick={onZoomReset}
          title="Reset zoom to fit"
          className="min-w-12 rounded-md px-1 py-1 text-center text-sm tabular-nums text-foreground transition-colors hover:bg-muted"
        >
          {zoomPercent}
        </button>
        <FooterButton label="Zoom out" onClick={onZoomOut} disabled={!canZoomOut}>
          <ZoomOutIcon className="size-4" />
        </FooterButton>
        <FooterButton
          label={isFullscreen ? "Exit full screen" : "Full screen"}
          onClick={onToggleFullscreen}
          className="ml-1 border border-border"
        >
          {isFullscreen ? (
            <MinimizeIcon className="size-4" />
          ) : (
            <MaximizeIcon className="size-4" />
          )}
        </FooterButton>
      </div>
    </footer>
  );
}

function FooterButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
    >
      {children}
    </button>
  );
}
