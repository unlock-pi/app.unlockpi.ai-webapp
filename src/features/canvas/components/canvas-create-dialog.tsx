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
import { Field, FieldDescription, FieldItem, FieldLabel } from "@/components/ui/field";
import { Fieldset, FieldsetLegend } from "@/components/ui/fieldset";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Radio, RadioGroup } from "@/components/ui/radio-group";
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
              <InputGroup
                className={cn(
                  "min-h-11 rounded-2xl transition-[border-color,box-shadow,background-color]",
                  "hover:bg-accent/20 focus-within:bg-background",
                  "[&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:outline-none",
                  "[&_[data-slot=input]]:ring-0 [&_[data-slot=input]]:shadow-none",
                  "[&_[data-slot=input]]:focus-visible:ring-0 [&_[data-slot=input]]:focus-visible:border-transparent",
                )}
              >
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
                <InputGroupAddon align="inline-end" className="text-muted-foreground">
                  <SearchIcon />
                </InputGroupAddon>
              </InputGroup>
            </div>

            <Field
              className="gap-3"
              name="canvas-template"
              render={(props) => <Fieldset {...props} className="max-w-none gap-3" />}
            >
              <FieldsetLegend className="text-sm">Start from template</FieldsetLegend>
              <FieldDescription>
                Pick the starter layout that should open first in the editor.
              </FieldDescription>
              <RadioGroup
                value={selectedTemplateKey}
                onValueChange={(value) =>
                  onTemplateSelect(value as CanvasTemplateKey)
                }
                className="grid gap-3 sm:grid-cols-2"
                aria-label="Canvas templates"
              >
                {filteredTemplates.map((template) => {
                  const preview =
                    template.image ? template : selectedTemplateSpotlight;

                  return (
                    <FieldItem key={template.key} className="min-w-0">
                      <FieldLabel className="flex w-full cursor-pointer flex-col items-stretch gap-0">
                        <Radio
                          value={template.key}
                          className="peer sr-only absolute"
                        />
                        <span
                          className={cn(
                            "flex h-28 items-center overflow-hidden rounded-3xl bg-card text-left shadow-[inset_0_0_0_1px_var(--border)] transition-[transform,box-shadow,background-color] hover:bg-accent active:scale-[0.98]",
                            "peer-data-checked:bg-primary/8 peer-data-checked:shadow-[inset_0_0_0_1.5px_var(--primary)]",
                          )}
                        >
                          <span className="min-w-0 flex-1 p-4 pb-2">
                            <span className="block font-semibold tracking-tight">
                              {template.title}
                            </span>
                            <span className="mt-2 line-clamp-2 block text-sm leading-4 text-muted-foreground">
                              {template.description}
                            </span>
                          </span>
                          <span className="w-72 pt-4 pb-2 pr-2">
                            <Image
                              src={preview.image}
                              alt={template.title}
                              width={280}
                              height={160}
                              className="h-28 w-full rounded-2xl object-cover"
                            />
                          </span>
                        </span>
                      </FieldLabel>
                    </FieldItem>
                  );
                })}
              </RadioGroup>
            </Field>
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
