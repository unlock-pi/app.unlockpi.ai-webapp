"use client";

import { BotIcon, InfoIcon, MicIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";
import type { CanvasPresentationMode } from "@/features/canvas/components/canvas-presenter";
import { cn } from "@/lib/utils";

type CanvasStartClassDialogProps = {
  isStartClassOpen: boolean;
  actions: Pick<
    CanvasEditorController["actions"],
    "persistCanvas" | "setIsStartClassOpen" | "setPresentationMode"
  >;
};

const classModes: Array<{
  mode: CanvasPresentationMode;
  icon: LucideIcon;
  title: string;
  tagline: string;
  details: string;
  featured: boolean;
}> = [
  {
    mode: "voice",
    icon: MicIcon,
    title: "Voice Director",
    tagline: "Silent frame control",
    details:
      "A silent AI listens while you teach and switches frames when you ask naturally. It never speaks over you.",
    featured: true,
  },
  {
    mode: "companion",
    icon: BotIcon,
    title: "AI Companion",
    tagline: "Spoken co-teacher",
    details:
      "A concise spoken co-teacher that can answer questions, navigate frames, and create temporary visual examples during class.",
    featured: false,
  },
];

export function CanvasStartClassDialog({
  actions,
  isStartClassOpen,
}: CanvasStartClassDialogProps) {
  const startClass = (mode: CanvasPresentationMode) => {
    actions.setPresentationMode(mode);
    actions.setIsStartClassOpen(false);
    void actions.persistCanvas();
  };

  return (
    <Dialog open={isStartClassOpen} onOpenChange={actions.setIsStartClassOpen}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Start class</DialogTitle>
          <DialogDescription>
            Pick how the AI joins. You can switch modes or disconnect anytime
            without ending the class.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="grid gap-3 sm:grid-cols-2">
          {classModes.map(({ mode, icon: Icon, title, tagline, details, featured }) => (
            <div key={mode} className="relative">
              <button
                type="button"
                onClick={() => startClass(mode)}
                className={cn(
                  "flex w-full flex-col items-start gap-4 rounded-2xl border p-5 text-left outline-none transition-[background-color,border-color,transform] focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                  featured
                    ? "border-primary bg-primary/8 hover:bg-primary/12"
                    : "bg-card hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "grid size-10 place-items-center rounded-full",
                    featured
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {tagline}
                  </span>
                </span>
              </button>

              <Popover>
                <PopoverTrigger
                  openOnHover
                  render={
                    <Button
                      aria-label={`About ${title}`}
                      size="icon-xs"
                      variant="ghost"
                      className="absolute right-3 top-3 text-muted-foreground"
                    />
                  }
                >
                  <InfoIcon />
                </PopoverTrigger>
                <PopoverPopup side="top" tooltipStyle className="max-w-64">
                  <p>{details}</p>
                </PopoverPopup>
              </Popover>
            </div>
          ))}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
