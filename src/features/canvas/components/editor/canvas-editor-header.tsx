"use client";

import { MoonIcon, PanelRightIcon, PresentationIcon, SaveIcon, Share2Icon, SunIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/logo";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";

type CanvasEditorHeaderProps = {
  controller: CanvasEditorController;
};

export function CanvasEditorHeader({
  controller,
}: CanvasEditorHeaderProps) {
  const {
    actions,
    aiPanelOpen,
    canvasTitle,
    isLightTheme,
    isTitleEditing,
    saveStatus,
  } = controller;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-2xl border border-border bg-muted/20 text-primary">
          <Logo />
        </div>
        <div className="min-w-0">
          {isTitleEditing ? (
            <Input
              autoFocus
              value={canvasTitle}
              onBlur={() => {
                actions.setIsTitleEditing(false);
                actions.flushTitleSave();
              }}
              onChange={(event) =>
                actions.handleCanvasTitleChange(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  actions.setIsTitleEditing(false);
                  actions.flushTitleSave();
                }
              }}
              className="h-8 max-w-sm text-sm font-semibold"
            />
          ) : (
            <button
              type="button"
              onClick={() => actions.setIsTitleEditing(true)}
              className="truncate text-left text-sm font-semibold transition hover:text-primary"
            >
              {canvasTitle}
            </button>
          )}
          <p className="text-xs text-muted-foreground">{saveStatus}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => actions.setIsStartClassOpen(true)}>
          <PresentationIcon className="size-4" />
          Start class
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void actions.persistCanvas()}
        >
          <SaveIcon className="size-4" />
          Save draft
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => actions.setIsShareDialogOpen(true)}
        >
          <Share2Icon className="size-4" />
          Share
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label={isLightTheme ? "Switch to dark theme" : "Switch to light theme"}
          onClick={actions.toggleTheme}
        >
          {isLightTheme ? (
            <MoonIcon className="size-4" />
          ) : (
            <SunIcon className="size-4" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={aiPanelOpen ? "Collapse inspector" : "Expand inspector"}
          onClick={() => actions.setAiPanelOpen((open) => !open)}
        >
          <PanelRightIcon className="size-4" />
        </Button>
      </div>
    </header>
  );
}
