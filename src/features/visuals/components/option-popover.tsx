"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronDownIcon } from "lucide-react";

import { PromptInputButton } from "@/components/ai-elements/prompt-input";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type VisualOption = {
  value: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  /** Custom preview node (e.g. a shape or grid) instead of an icon. */
  preview?: ReactNode;
};

type OptionPopoverProps = {
  triggerLabel: string;
  triggerIcon?: LucideIcon;
  options: VisualOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
};

/**
 * Icon+label trigger that opens a grid of visual preview cards. Used for every
 * generation option (style, quality, aspect ratio, count, diagram type) so
 * they share one look instead of five different dropdown styles.
 */
export function OptionPopover({
  triggerLabel,
  triggerIcon: TriggerIcon,
  options,
  value,
  onChange,
  columns = 2,
}: OptionPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<PromptInputButton size="sm" />}>
        {TriggerIcon ? <TriggerIcon className="size-4" aria-hidden="true" /> : null}
        <span>{triggerLabel}</span>
        <ChevronDownIcon className="size-3.5 opacity-60" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverPopup
        align="start"
        className={cn("w-auto min-w-56", columns === 1 && "min-w-40")}
      >
        <div
          className={cn(
            "grid gap-2",
            columns === 1 && "grid-cols-1",
            columns === 2 && "grid-cols-2",
            columns === 3 && "grid-cols-3",
          )}
        >
          {options.map((option) => {
            const isActive = option.value === value;
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center outline-none transition-[background-color,border-color,transform] active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "border-border bg-card text-muted-foreground hover:bg-accent",
                )}
              >
                {option.preview ??
                  (Icon ? (
                    <Icon
                      className={cn(
                        "size-5",
                        isActive ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden="true"
                    />
                  ) : null)}
                <span className="text-xs font-medium leading-tight">{option.label}</span>
                {option.hint ? (
                  <span className="text-[10px] leading-tight text-muted-foreground">
                    {option.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverPopup>
    </Popover>
  );
}

/** Small rectangle preview sized to an aspect ratio's w:h box, for the ratio picker. */
export function AspectRatioPreview({ w, h }: { w: number; h: number }) {
  return (
    <span className="grid h-8 w-8 place-items-center">
      <span
        className="rounded-[3px] border-2 border-current"
        style={{ width: w, height: h }}
      />
    </span>
  );
}

/** NxN dot grid preview for the image-count picker. */
export function CountPreview({ count }: { count: number }) {
  return (
    <span className="grid h-8 w-8 grid-cols-2 place-items-center gap-1 p-1">
      {Array.from({ length: 4 }).map((_, index) => (
        <span
          key={index}
          className={cn(
            "size-2.5 rounded-[3px]",
            index < count ? "bg-current" : "bg-current/15",
          )}
        />
      ))}
    </span>
  );
}
