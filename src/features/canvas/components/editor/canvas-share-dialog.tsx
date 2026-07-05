"use client";

import {
  CheckIcon,
  CopyIcon,
  InfoIcon,
  LoaderCircleIcon,
  SaveIcon,
  Share2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";
import { cn } from "@/lib/utils";

type CanvasShareDialogProps = {
  controller: CanvasEditorController;
};

export function CanvasShareDialog({ controller }: CanvasShareDialogProps) {
  return (
    <Dialog
      open={controller.isShareDialogOpen}
      onOpenChange={controller.actions.setIsShareDialogOpen}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Share canvas</DialogTitle>
          <DialogDescription>
            Share to create a public link, or export the full canvas as a PDF
            from the browser.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="grid gap-4">
          <div className="rounded-xl border border-border bg-muted/20 py-4">
            <div className="flex items-center gap-2 pb-1">
              <p className="text-sm font-semibold ">Share to create a public link</p>
              <Popover>
                <PopoverTrigger
                  openOnHover
                  render={
                    <Button
                      aria-label="Password requirements"
                      size="icon-xs"
                      variant="ghost"
                    />
                  }
                >
                  <InfoIcon />
                </PopoverTrigger>
                <PopoverPopup side="top" tooltipStyle>
                  <p>
                    Turn this canvas into a public read-only link for teaching
                    and review.
                  </p>
                </PopoverPopup>
              </Popover>
            </div>
            <div className="flex flex-row-reverse">
              {controller.shareError ? (
                <p className="mt-2 text-xs text-destructive">
                  {controller.shareError}
                </p>
              ) : null}
              <InputGroup
                className={cn(
                  "mt-1 min-h-11 rounded-2xl transition-[border-color,box-shadow,background-color]",
                  "hover:bg-accent/20 focus-within:bg-background",
                  "[&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:outline-none",
                  "[&_[data-slot=input]]:ring-0 [&_[data-slot=input]]:shadow-none",
                  "[&_[data-slot=input]]:focus-visible:ring-0 [&_[data-slot=input]]:focus-visible:border-transparent",
                )}
              >
                <InputGroupInput
                  aria-label="Public link"
                  placeholder="Public link"
                  type="text"
                  readOnly
                  value={controller.publicLink}
                  className={cn(
                    "[&_[data-slot=input]]:h-11 [&_[data-slot=input]]:pe-1 [&_[data-slot=input]]:font-variant-numeric-tabular",
                  )}
                />
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="Copy public link"
                        size="icon-sm"
                        variant="ghost"
                        className="mr-1 shrink-0 rounded-xl hover:bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                        onClick={() => void controller.actions.copyPublicLink()}
                      />
                    }
                  >
                    {controller.shareSlug ? (
                      controller.copySuccess ? (
                        <CheckIcon className="size-4 text-green-500" />
                      ) : (
                        <CopyIcon className="size-4" />
                      )
                    ) : (
                      <CopyIcon className="size-4 opacity-40" />
                    )}
                  </TooltipTrigger>
                  <TooltipPopup>Copy link</TooltipPopup>
                </Tooltip>
              </InputGroup>
            </div>
          </div>
        </DialogPanel>
        <DialogFooter className="block">
          <div className="flex flex-wrap items-baseline gap-2 rounded-xl border border-border bg-muted/20">
            <Button
              className="mt-3  size-20! flex flex-col! rounded-2xl "
              variant="ghost"
              disabled={controller.isDownloadingPdf}
              onClick={() => void controller.actions.downloadAsPdf()}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary p-2">
                {controller.isDownloadingPdf ? (
                  <LoaderCircleIcon className="size-5 animate-spin text-white dark:text-black" />
                ) : (
                  <SaveIcon className="size-5 text-white dark:text-black" />
                )}
              </span>
              <span className="text-xs">
                {controller.isDownloadingPdf ? "Preparing" : "Download"}
              </span>
            </Button>

            <Button
              className="mt-3  size-20! flex flex-col! rounded-2xl "
              variant="ghost"
              onClick={() => void controller.actions.handleCreatePublicLink()}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary p-2">
                <Share2Icon className="size-5 text-white dark:text-black" />
              </span>
              <span className="text-xs w-20 whitespace-pre-wrap">
                {controller.isPublic ? "Refresh public link" : "Create public link"}
              </span>
            </Button>
          </div>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
