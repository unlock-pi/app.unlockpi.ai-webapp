"use client";

import { useRouter } from "next/navigation";
import { Render } from "@puckeditor/core";
import {
  BotIcon,
  BracketsIcon,
  DoorOpenIcon,
  MicIcon,
  MoonIcon,
  PanelRightIcon,
  PresentationIcon,
  SaveIcon,
  Share2Icon,
  SunIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Group, GroupSeparator } from "@/components/ui/group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Logo from "@/components/logo";
import { ARRAYS_AGENT_NAME } from "@/features/arrays-agent/lib/agent-name";
import type { CanvasPresentationMode } from "@/features/canvas/components/canvas-presenter";
import { canvasPuckConfig } from "@/features/canvas/components/canvas-puck-config";
import { getCanvasPresentationFrames } from "@/features/canvas/lib/canvas-presentation";
import type { CanvasEditorController } from "@/features/canvas/types/canvas-other-types";
import type { CanvasDocument } from "@/features/canvas/types/canvas-types";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { MdCloudDone } from "react-icons/md";
import { cn } from "@/lib/utils";
import { CircleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Frame, FrameFooter } from "@/components/ui/frame";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
const frameworkOptions = [
  { label: "Next.js", value: "next" },
  { label: "Vite", value: "vite" },
  { label: "Remix", value: "remix" },
  { label: "Astro", value: "astro" },
];
type CanvasEditorHeaderProps = {
  aiPanelOpen: boolean;
  canvasDocument: CanvasDocument;
  canvasTitle: string;
  canvasTitleDraft: string;
  easyMode: boolean;
  isLightTheme: boolean;
  isTitleEditing: boolean;
  saveStatus: string;
  actions: Pick<
    CanvasEditorController["actions"],
    | "commitCanvasTitle"
    | "flushTitleSave"
    | "handleCanvasTitleChange"
    | "persistCanvas"
    | "setAiPanelOpen"
    | "setEasyMode"
    | "setIsShareDialogOpen"
    | "setIsTitleEditing"
    | "setPresentationMode"
    | "toggleTheme"
  >;
};

import {
  Popover,
  PopoverClose,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Coolshape } from "coolshapes-react";
import {
  ONBOARDING_QUERY_PARAM,
  ONBOARDING_QUERY_VALUE,
} from "@/features/onboarding/lib/onboarding-tour";

// The AI modes a class can start in — Manual (no AI) is reachable from
// inside the presenter itself, so it isn't offered as a starting choice
// here. Mirrors CanvasPresenter's own ModeButton labels/icons.
const classModes: Array<{
  mode: CanvasPresentationMode;
  icon: LucideIcon;
  title: string;
  tagline: string;
}> = [
  {
    mode: "voice",
    icon: MicIcon,
    title: "Copilot",
    tagline: "Silent, keeps your board in sync",
  },
  {
    mode: "companion",
    icon: BotIcon,
    title: "Co-teacher",
    tagline: "Speaks aloud alongside you",
  },
  {
    mode: "arrays",
    icon: BracketsIcon,
    title: ARRAYS_AGENT_NAME,
    tagline: "Teaches arrays — builds, sorts and searches on the board",
  },
];

export function CanvasEditorHeader({
  actions,
  aiPanelOpen,
  canvasDocument,
  canvasTitle,
  canvasTitleDraft,
  easyMode,
  isLightTheme,
  isTitleEditing,
  saveStatus,
}: CanvasEditorHeaderProps) {
  const router = useRouter();
  const firstFrame = getCanvasPresentationFrames(canvasDocument)[0] ?? null;

  const startClass = (mode: CanvasPresentationMode) => {
    actions.setPresentationMode(mode);
    void actions.persistCanvas();
  };

  return (
    <header className="flex h-14 mb-1  shrink-0 items-center justify-between border-b-2 border-card px-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid size-9 shrink-0 place-items-center bg-muted/20 text-primary">
          <Logo isLink={true} />
        </div>
        <div className="min-w-0">
          {isTitleEditing ? (
            <Input
              autoFocus
              // Bound to the RAW draft, not the trimmed `canvasTitle` — see
              // canvasTitleDraft in the controller. Trimming happens on
              // commit (blur/Enter), never mid-keystroke.
              value={canvasTitleDraft}
              onBlur={() => {
                actions.setIsTitleEditing(false);
                actions.commitCanvasTitle();
              }}
              onChange={(event) =>
                actions.handleCanvasTitleChange(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  actions.setIsTitleEditing(false);
                  actions.commitCanvasTitle();
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
        <Group
          className="py-5!"
          aria-label="Share options"
          orientation="horizontal"
        >
          <Popover>
            <PopoverTrigger
              render={<Button size="sm" className="py-[17.2px]" />}
            >
              <PresentationIcon className="size-4" />
              Start class
            </PopoverTrigger>
            <PopoverPopup className="w-96 ">
              {/* <div className="mb-3">
                <PopoverTitle className="text-base">Start class</PopoverTitle>
                <PopoverDescription>
                  Pick how the AI joins. You can switch modes or disconnect
                  anytime without ending the class.
                </PopoverDescription>
              </div> */}

              <div className="grid grid-cols-2 gap-2">
                {classModes.map(({ mode, icon: Icon, title, tagline }) => (
                  <PopoverClose
                    key={mode}
                    render={<div role="button" tabIndex={0} />}
                    onClick={() => startClass(mode)}
                    className={cn(
                      "flex flex-col  overflow-hidden w-full items-start gap-3   py-3 text-left outline-none transition-[background-color,border-color]  focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
                      // title !== "Copilot" ?
                      //   "bg-primary/10 hover:bg-primary/20": "bg-card-foreground/10",
                    )}
                  >
                    <div>
                      <div className="flex">
                        <span className="grid size- shrink-0 place-items-center rounded-full bg-muted text-foreground">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="ml-1 block text-sm font-semibold">
                          {title}
                        </span>
                      </div>
                    </div>
                    <Frame
                      className={cn(
                        "w-full max-w-xs hover:cursor-pointer",
                        title !== "Copilot"
                          ? "bg-primary/90 hover:bg-primary/75  "
                          : "bg-card-foreground/10 ",
                      )}
                    >
                      <Card>
                        {/* <CardHeader>
                          <CardTitle>Create project</CardTitle>
                          <CardDescription>
                            Deploy your new project in one-click.
                          </CardDescription>
                        </CardHeader> */}
                        <CardPanel className="p-0">
                          <div
                            className={cn(
                              "canvas-presenter-frame relative -8ml-2 h-22 w-40 overflow-hidden rounded-lg border border-border bg-[var(--canvas-stage,var(--muted))]",
                            )}
                          >
                            <div
                              className="pointer-events-none overflow-hidden absolute left-0 top-0 origin-top-left"
                              style={{
                                width: 580,
                                height: 320,
                                transform: "scale(0.302)",
                              }}
                            >
                              <Render
                                config={canvasPuckConfig}
                                data={firstFrame.document}
                              />
                            </div>
                            {title === "Copilot" ? (
                              <Coolshape
                                type="flower"
                                index={1}
                                noise={false}
                                size={32}
                                className="absolute z-50 -right-1.5 -bottom-1.5"
                              />
                            ) : (
                              <Coolshape
                                type="flower"
                                index={2}
                                noise={false}
                                size={32}
                                className="absolute z-50 -right-1.5 -bottom-1.5"
                              />
                            )}
                          </div>
                        </CardPanel>
                      </Card>
                      <FrameFooter className="px-0 py-0.5">
                        <div className="flex gap-1 text-muted-foreground text-xs">
                          <CircleAlertIcon className={cn("size-3 h-lh shrink-0", title !== "Copilot" ? "text-primary-foreground" : "text-muted-foreground")} />
                          <p>
                            {" "}
                            <span className="min-w-0 ">
                              <span
                                className={cn(
                                  "block  text-xs ",
                                  title !== "Copilot"
                                    ? "text-primary-foreground "
                                    : " ",
                                )}
                              >
                                {tagline}
                              </span>
                            </span>
                          </p>
                        </div>
                      </FrameFooter>
                    </Frame>
                  </PopoverClose>
                ))}
              </div>

              {/*
                First-page preview: renders the actual first frame at a
                fixed design width (1024px) then CSS-scales it down to fit —
                the same live block config used everywhere else in the
                canvas, just shrunk, so it's a real preview and not a
                placeholder box. `overflow-hidden` + `aspect-video` clips
                whatever spills past a 16:9 window, which is fine for a
                glance-preview.
              */}
              {/* {firstFrame ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                    First page
                  </p>
                  <div
                    className={cn(
                      "canvas-presenter-frame relative h-24 w-48 overflow-hidden rounded-lg border border-border bg-[var(--canvas-stage,var(--muted))]",
                    )}
                  >
                    <div
                      className="pointer-events-none overflow-hidden absolute left-0 top-0 origin-top-left"
                      style={{
                        width: 620,
                        height: 320,
                        transform: "scale(0.362)",
                      }}
                    >
                      <Render
                        config={canvasPuckConfig}
                        data={firstFrame.document}
                      />
                    </div>
                  </div>
                </div>
              ) : null} */}
            </PopoverPopup>
          </Popover>
          <GroupSeparator orientation="vertical" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  className="py-[17.2px]"
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
            className="py-[17.2px]"
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
              onCheckedChange={(checked) =>
                actions.setEasyMode(Boolean(checked))
              }
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
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon"
                variant="outline"
                aria-label="Take the tour"
                onClick={() =>
                  router.push(
                    `/dashboard/projects?${ONBOARDING_QUERY_PARAM}=${ONBOARDING_QUERY_VALUE}`,
                  )
                }
              />
            }
          >
            <DoorOpenIcon className="size-4" />
          </TooltipTrigger>
          <TooltipPopup>
            <p>Take the tour</p>
          </TooltipPopup>
        </Tooltip>
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
