"use client";

import Image from "next/image";
import { LoaderCircleIcon, PlusIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { canvasTemplateOptions } from "@/features/canvas/lib/canvas-templates";
import type { CanvasTemplateKey } from "@/features/canvas/types/canvas-types";
import { cn } from "@/lib/utils";
import { PiChalkboardDuotone } from "react-icons/pi";

type CanvasCreateDialogProps = {
  filteredTemplates: typeof canvasTemplateOptions;
  isPending: boolean;
  onCreate: () => void;
  onOpenChange: (open: boolean) => void;
  onTemplateSelect: (templateKey: CanvasTemplateKey) => void;
  onTopicSearchChange: (value: string) => void;
  open: boolean;
  selectedTemplateKey: CanvasTemplateKey;
  templateError: string | null;
  topicSearch: string;
};

export function CanvasCreateDialog({
  filteredTemplates,
  isPending,
  onCreate,
  onOpenChange,
  onTemplateSelect,
  onTopicSearchChange,
  open,
  selectedTemplateKey,
  templateError,
  topicSearch,
}: CanvasCreateDialogProps) {
  const selectedTemplateSpotlight =
    filteredTemplates.find((template) => template.key === selectedTemplateKey) ??
    canvasTemplateOptions.find((template) => template.key === selectedTemplateKey) ??
    canvasTemplateOptions[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="gap-1!">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <PiChalkboardDuotone className="size-6" />
            Create canvas
          </DialogTitle>
          <DialogDescription>
            {/* Search a Computer Science topic, then choose the template that */}
            Search for a topic and choose the template that
            should open in the editor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 px-6 pb-2 mt-2">
          <div className="grid gap-4">
            <div className="grid gap-2">
              {/* <Label htmlFor="canvas-topic-search">Topic search</Label> */}
              <InputGroup
                className={cn(
                  "min-h-11 rounded-2xl transition-[border-color,box-shadow,background-color]",
                  "hover:bg-accent/20 focus-within:bg-background",
                  "[&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:outline-none",
                  "[&_[data-slot=input]]:ring-0 [&_[data-slot=input]]:shadow-none",
                  "[&_[data-slot=input]]:focus-visible:ring-0 [&_[data-slot=input]]:focus-visible:border-transparent",
                )}
              >
                <InputGroupAddon className="text-muted-foreground">
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="canvas-topic-search"
                  aria-label="Search"
                  placeholder="Search templates or topic"
                  type="search"
                  value={topicSearch}
                  onChange={(event) => onTopicSearchChange(event.target.value)}
                  className={cn(
                    "[&_[data-slot=input]]:h-11 [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:pe-3",
                  )}
                />
              </InputGroup>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 ">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplateKey === template.key;
                const preview = template.image ? template : selectedTemplateSpotlight;

                return (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => onTemplateSelect(template.key)}
                    className={cn(
                      "flex h-28 items-center overflow-hidden rounded-3xl bg-card text-left shadow-[inset_0_0_0_1px_var(--border)] transition-[transform,box-shadow,background-color] hover:bg-accent active:scale-[0.98]",
                      isSelected
                        ? "bg-primary/8 shadow-[inset_0_0_0_1.5px_var(--primary)]"
                        : "",
                    )}
                  >
                    <div className="p-4 pb-2">
                      <p className="font-semibold tracking-tight">
                        {template.title}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-4 text-muted-foreground">
                        {template.description}
                      </p>
                    </div>
                    <div className="w-72 pt-4 pb-2">
                      <Image
                        src={preview.image}
                        alt={template.title}
                        width={280}
                        height={160}
                        className="h-28 w-full rounded-2xl object-cover"
                      />
                    </div>
                  </button>
                );
              })}
            </div>
            {templateError ? (
              <p className="text-sm text-destructive">{templateError}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={isPending}>
            {isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <PlusIcon className="size-4" />
            )}
            Open editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
