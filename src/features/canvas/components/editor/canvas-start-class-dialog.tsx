"use client";

import { BotIcon, MicIcon } from "lucide-react";

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";

type CanvasStartClassDialogProps = {
  controller: CanvasEditorController;
};

export function CanvasStartClassDialog({
  controller,
}: CanvasStartClassDialogProps) {
  return (
    <Dialog
      open={controller.isStartClassOpen}
      onOpenChange={controller.actions.setIsStartClassOpen}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Start class</DialogTitle>
          <DialogDescription>
            Open the classroom first, then connect the AI when you are ready.
            You can switch modes or disconnect without ending the class.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              controller.actions.setPresentationMode("voice");
              controller.actions.setIsStartClassOpen(false);
              void controller.actions.persistCanvas();
            }}
            className="rounded-2xl border border-primary bg-primary/8 p-5 text-left transition hover:bg-primary/12"
          >
            <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <MicIcon className="size-4" />
            </div>
            <p className="mt-5 font-semibold">Voice Director</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Silent AI listens to your teaching and finds or changes frames
              when you ask naturally.
            </p>
          </button>
          <button
            type="button"
            onClick={() => {
              controller.actions.setPresentationMode("companion");
              controller.actions.setIsStartClassOpen(false);
              void controller.actions.persistCanvas();
            }}
            className="rounded-2xl border border-border bg-card p-5 text-left transition hover:bg-accent"
          >
            <div className="grid size-10 place-items-center rounded-full bg-muted text-foreground">
              <BotIcon className="size-4" />
            </div>
            <p className="mt-5 font-semibold">AI Companion</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              A concise spoken co-teacher that can answer, navigate, and create
              temporary visual examples during class.
            </p>
          </button>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
