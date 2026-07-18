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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";
import { cn } from "@/lib/utils";

type CanvasShareDialogProps = {
  copySuccess: boolean;
  isDownloadingPdf: boolean;
  isPublic: boolean;
  isShareDialogOpen: boolean;
  publicLink: string;
  shareError: string | null;
  shareSlug: string | null;
  actions: Pick<
    CanvasEditorController["actions"],
    | "copyPublicLink"
    | "downloadAsPdf"
    | "handleCreatePublicLink"
    | "setIsShareDialogOpen"
  >;
};

export function CanvasShareDialog({
  actions,
  copySuccess,
  isDownloadingPdf,
  isPublic,
  isShareDialogOpen,
  publicLink,
  shareError,
  shareSlug,
}: CanvasShareDialogProps) {
  return (
    <Dialog
      open={isShareDialogOpen}
      onOpenChange={actions.setIsShareDialogOpen}
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
              {shareError ? (
                <p className="mt-2 text-xs text-destructive">
                  {shareError}
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
                  value={publicLink}
                  className={cn(
                    "[&_[data-slot=input]]:h-11 [&_[data-slot=input]]:pe-1 [&_[data-slot=input]]:font-variant-numeric-tabular",
                  )}
                />
                <InputGroupAddon align="inline-end">
                  <Button
                    aria-label="Copy public link"
                    size="sm"
                    variant="ghost"
                    disabled={!shareSlug}
                    className="mr-1 shrink-0 rounded-xl px-2.5 hover:bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={() => void actions.copyPublicLink()}
                  >
                    {copySuccess ? (
                      <>
                        <CheckIcon className="size-4 text-green-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <CopyIcon
                          className={cn(
                            "size-4",
                            !shareSlug && "opacity-40",
                          )}
                        />
                        Copy
                      </>
                    )}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
        </DialogPanel>
        <DialogFooter className="block">
          <div className="flex flex-wrap items-baseline gap-2 rounded-xl border border-border bg-muted/20">
            <Button
              className="mt-3  size-20! flex flex-col! rounded-2xl "
              variant="ghost"
              disabled={isDownloadingPdf}
              onClick={() => void actions.downloadAsPdf()}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary p-2">
                {isDownloadingPdf ? (
                  <LoaderCircleIcon className="size-5 animate-spin text-white dark:text-black" />
                ) : (
                  <SaveIcon className="size-5 text-white " />
                )}
              </span>
              <span className="text-xs">
                {isDownloadingPdf ? "Preparing" : "Download"}
              </span>
            </Button>

            <Button
              className="mt-3  size-20! flex flex-col! rounded-2xl "
              variant="ghost"
              onClick={() => void actions.handleCreatePublicLink()}
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-primary p-2">
                <Share2Icon className="size-5 text-white " />
              </span>
              <span className="text-xs w-20 whitespace-pre-wrap">
                {isPublic ? "Refresh public link" : "Create public link"}
              </span>
            </Button>
          </div>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
