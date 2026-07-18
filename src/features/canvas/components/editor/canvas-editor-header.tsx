"use client";

import {
  MoonIcon,
  PanelRightIcon,
  PresentationIcon,
  SaveIcon,
  Share2Icon,
  SunIcon,
} from "lucide-react";
import { Group, GroupSeparator } from "@/components/ui/group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Logo from "@/components/logo";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { MdCloudDone } from "react-icons/md";

type CanvasEditorHeaderProps = {
  aiPanelOpen: boolean;
  canvasTitle: string;
  easyMode: boolean;
  isLightTheme: boolean;
  isTitleEditing: boolean;
  saveStatus: string;
  actions: Pick<
    CanvasEditorController["actions"],
    | "flushTitleSave"
    | "handleCanvasTitleChange"
    | "persistCanvas"
    | "setAiPanelOpen"
    | "setEasyMode"
    | "setIsShareDialogOpen"
    | "setIsStartClassOpen"
    | "setIsTitleEditing"
    | "toggleTheme"
  >;
};

export function CanvasEditorHeader({
  actions,
  aiPanelOpen,
  canvasTitle,
  easyMode,
  isLightTheme,
  isTitleEditing,
  saveStatus,
}: CanvasEditorHeaderProps) {
  return (
    <header className="flex h-14 mb-1  shrink-0 items-center justify-between border-b-2 border-card px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-2xl border border-border bg-muted/20 text-primary">
          <Logo isLink={true} />
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
          {/* <p className="text-xs text-muted-foreground">{saveStatus}</p> */}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Group aria-label="Share options" orientation="horizontal">
          <Button size="sm" onClick={() => actions.setIsStartClassOpen(true)}>
            <PresentationIcon className="size-4" />
            Start class
          </Button>{" "}
          <GroupSeparator orientation="vertical" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    void actions.persistCanvas();
                  }}
                >
                  <MdCloudDone className="size-4" />
                </Button>
              }
            />
            <TooltipPopup>
              <p>Save draft</p>
              <p className="text-xs text-muted-foreground">{saveStatus}</p>
            </TooltipPopup>
          </Tooltip>
          <GroupSeparator orientation="vertical" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => actions.setIsShareDialogOpen(true)}
          >
            <Share2Icon className="size-4" />
            Share
          </Button>
          <GroupSeparator orientation="vertical" />
          <Label
            className="flex h-9 items-center gap-3 rounded-full border border-border bg-background px-3 text-xs font-semibold text-foreground"
            data-slot="label"
          >
            <span>Easy mode</span>
            <Switch
              checked={easyMode}
              aria-label="Toggle easy mode"
              onCheckedChange={(checked) => actions.setEasyMode(Boolean(checked))}
              className="sm:[--thumb-size:--spacing(3.5)]"
            />
          </Label>
        </Group>

        <Button
          size="icon"
          variant="outline"
          aria-label={
            isLightTheme ? "Switch to dark theme" : "Switch to light theme"
          }
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
