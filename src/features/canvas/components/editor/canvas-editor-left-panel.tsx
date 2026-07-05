"use client";

import { Puck } from "@puckeditor/core";
import { BracesIcon, CheckIcon, ChevronLeftIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  leftPanelCopy,
  quickCommands,
} from "@/features/canvas/lib/canvas-client-helpers";
import {
  canvasThemeOptions,
  canvasTypographyOptions,
} from "@/features/canvas/lib/canvas-theme";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";
import { cn } from "@/lib/utils";

type CanvasEditorLeftPanelProps = {
  controller: CanvasEditorController;
};

export function CanvasEditorLeftPanel({
  controller,
}: CanvasEditorLeftPanelProps) {
  if (!controller.showToolPanel) {
    return null;
  }

  return (
    <aside
      aria-label={`${leftPanelCopy[controller.leftPanelView].title} tool panel`}
      className="min-h-0 border-r border-border bg-background lg:flex lg:flex-col"
    >
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              {leftPanelCopy[controller.leftPanelView].title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {leftPanelCopy[controller.leftPanelView].description}
            </p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Collapse left panel"
            onClick={() => controller.actions.setToolPanelOpen(false)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1" scrollFade scrollbarGutter>
        <div className="p-3">
          {controller.leftPanelView === "home" ? (
            <div className="grid gap-5">
              <div className="canvas-component-palette">
                <Puck.Components />
              </div>
            </div>
          ) : null}

          {controller.leftPanelView === "frames" ? (
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => controller.actions.applyAction({ action: "add_frame" })}
                className="flex min-h-11 items-center justify-between rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-left text-xs transition hover:border-primary hover:bg-primary/8"
              >
                <span className="font-semibold">Add frame</span>
                <PlusIcon className="size-4 text-muted-foreground" />
              </button>

              {controller.frames.map((frame, index) => (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() =>
                    controller.actions.applyAction({
                      action: "go_to_frame",
                      frameIndex: index,
                    })
                  }
                  className={cn(
                    "rounded-lg border p-2 text-left text-xs transition hover:bg-accent",
                    controller.activeSlideId === frame.id
                      ? "border-primary bg-primary/8"
                      : "border-border bg-background",
                  )}
                >
                  <span className="font-semibold">Frame {index + 1}</span>
                  <span className="mt-1 block truncate text-muted-foreground">
                    {frame.title}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {controller.leftPanelView === "changes" ? (
            <div className="grid gap-2">
              {controller.actionLog.map((item) => (
                <p
                  key={item.id}
                  className="rounded-lg border border-border bg-muted/30 p-2 text-xs"
                >
                  {item.message}
                </p>
              ))}
            </div>
          ) : null}

          {controller.leftPanelView === "commands" ? (
            <div className="grid gap-3">
              <Label htmlFor="canvas-command-left">Command JSON</Label>
              <Textarea
                id="canvas-command-left"
                value={controller.commandDraft}
                onChange={(event) =>
                  controller.actions.setCommandDraft(event.target.value)
                }
                className="min-h-36 font-mono text-xs"
              />
              {controller.commandError ? (
                <p className="text-xs text-destructive">
                  {controller.commandError}
                </p>
              ) : null}
              <Button onClick={controller.actions.runJsonCommand}>
                <BracesIcon className="size-4" />
                Run command
              </Button>
            </div>
          ) : null}

          {controller.leftPanelView === "voice" ? (
            <div className="grid gap-2">
              {quickCommands.map((command) => (
                <Button
                  key={command.label}
                  variant="outline"
                  className="justify-start"
                  onClick={() => controller.actions.applyAction(command.action)}
                >
                  {command.label}
                </Button>
              ))}
            </div>
          ) : null}

          {controller.leftPanelView === "theme" ? (
            <div className="grid gap-6">
              <section>
                {/* <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Frame theme
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    One palette is applied to every frame, including presentation
                    mode.
                  </p>
                </div> */}
                <div className="grid grid-cols-2 gap-2">
                  {canvasThemeOptions.map((theme) => {
                    const isActive = controller.activeCanvasTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() =>
                          controller.actions.updateCanvasAppearance({
                            theme: theme.id,
                          })
                        }
                        className={cn(
                          "group relative h-24 rounded-xl p-2.5 text-left outline-none transition-[transform,box-shadow,background-color] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "bg-primary/8 shadow-[inset_0_0_0_1.5px_var(--primary)]"
                            : "bg-none",
                        )}
                      >
                        <div className="flex h-12 overflow-hidden rounded-lg shadow-[0_5px_14px_rgba(0,0,0,0.09)] ring-1 ring-black/10 dark:ring-white/10">
                          {theme.colors.map((color) => (
                            <span
                              key={color}
                              className="h-full flex-1"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold">
                            {theme.name}
                          </span>
                          <CheckIcon
                            className={cn(
                              "size-3.5 text-primary transition-[opacity,scale,filter] duration-200",
                              isActive
                                ? "scale-100 opacity-100 blur-0"
                                : "scale-25 opacity-0 blur-[4px]",
                            )}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Typography size
                  </p>
                  {/* <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    A fixed sans-serif system keeps every lesson consistent.
                  </p> */}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {canvasTypographyOptions.map((scale) => {
                    const isActive =
                      controller.activeTypographyScale === scale.id;
                    return (
                      <button
                        key={scale.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() =>
                          controller.actions.updateCanvasAppearance({
                            typographyScale: scale.id,
                          })
                        }
                        className={cn(
                          "flex flex-col relative min-h-16 items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-[transform,box-shadow,background-color] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring",
                          isActive
                            ? "bg-primary/8 shadow-[inset_0_0_0_1.5px_var(--primary)]"
                            : "bg-muted/35 shadow-[inset_0_0_0_1px_var(--border)] hover:bg-muted/60",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-10 shrink-0 place-items-center rounded-lg bg-background font-sans font-semibold shadow-sm",
                            scale.previewSize,
                          )}
                        >
                          Aa
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold">
                            {scale.name}
                          </span>
                          {/* <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
                            {scale.description}
                          </span> */}
                        </span>
                        <CheckIcon
                          className={cn(
                            "absolute right-0 top-0 size-3.5 shrink-0 text-primary transition-[opacity,scale,filter] duration-200",
                            isActive
                              ? "scale-100 opacity-100 blur-0"
                              : "scale-25 opacity-0 blur-[4px]",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  );
}
