"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BriefcaseBusinessIcon,
  FolderIcon,
  MoreHorizontalIcon,
  PenLineIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { PiChalkboardDuotone } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardFrame,
  CardFrameAction,
  CardFrameHeader,
  CardFrameTitle,
  CardPanel,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "@/components/ui/menu";
import { toastManager } from "@/components/ui/toast";
import { CanvasCreateDialog } from "@/features/canvas/components/canvas-create-dialog";
import {
  buildCanvasPayload,
  createShareSlug,
  formatUpdatedAt,
} from "@/features/canvas/lib/canvas-client-helpers";
import {
  getInitialSlideId,
  normalizeCanvasFrames,
} from "@/features/canvas/lib/canvas-commands";
import type { CanvasSummary } from "@/features/canvas/lib/canvas-records";
import { mapCanvasSummary } from "@/features/canvas/lib/canvas-records";
import {
  canvasTemplateOptions,
  createCanvasTemplate,
} from "@/features/canvas/lib/canvas-templates";
import type {
  CanvasProjectContext,
  CanvasProjectOption,
} from "@/features/canvas/types/canvas-other-types";
import type { CanvasTemplateKey } from "@/features/canvas/types/canvas-types";
import { createClient as createSupabaseClient } from "@/lib/client";

type CanvasLibraryBrowserProps = {
  availableProjects: CanvasProjectOption[];
  initialCanvases: CanvasSummary[];
  projectContext?: CanvasProjectContext | null;
  showTemplateSpotlights: boolean;
};

export function CanvasLibraryBrowser({
  availableProjects,
  initialCanvases,
  projectContext = null,
  showTemplateSpotlights,
}: CanvasLibraryBrowserProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [canvasRecords, setCanvasRecords] =
    useState<CanvasSummary[]>(initialCanvases);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] =
    useState<CanvasTemplateKey>("array-intro");
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [movingCanvasIds, setMovingCanvasIds] = useState<
    Record<string, string>
  >({});

  const filteredTemplates = useMemo(() => {
    const query = topicSearch.trim().toLowerCase();

    if (!query) {
      return canvasTemplateOptions;
    }

    return canvasTemplateOptions.filter((template) =>
      `${template.title} ${template.description}`.toLowerCase().includes(query),
    );
  }, [topicSearch]);

  const updateCanvasSummary = (nextSummary: CanvasSummary) => {
    setCanvasRecords((items) => {
      const existing = items.some((item) => item.id === nextSummary.id);
      const nextItems = existing
        ? items.map((item) => (item.id === nextSummary.id ? nextSummary : item))
        : [nextSummary, ...items];

      return nextItems.sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime(),
      );
    });
  };

  const removeCanvasSummary = (canvasId: string) => {
    setCanvasRecords((items) => items.filter((item) => item.id !== canvasId));
  };

  const updateCanvasProjectLocally = (
    canvasId: string,
    nextProjectId: string | null,
  ) => {
    setCanvasRecords((items) => {
      const nextItems = items.map((item) =>
        item.id === canvasId ? { ...item, projectId: nextProjectId } : item,
      );

      if (projectContext && nextProjectId !== projectContext.id) {
        return nextItems.filter((item) => item.id !== canvasId);
      }

      return nextItems;
    });
  };

  async function renameCanvasRecord(canvas: CanvasSummary) {
    const nextTitle = window.prompt("Rename canvas", canvas.title)?.trim();

    if (!nextTitle || nextTitle === canvas.title) {
      return;
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("teaching_canvases")
      .update({ title: nextTitle, topic: canvas.topic || nextTitle })
      .eq("id", canvas.id)
      .select(
        "id, title, subject, template_key, updated_at, status, share_slug, is_public, topic, project_id",
      )
      .single();

    if (error || !data) {
      toastManager.add({
        title: "Canvas not renamed",
        description: error?.message ?? "Could not rename this canvas.",
        type: "error",
      });
      return;
    }

    updateCanvasSummary(mapCanvasSummary(data));
    toastManager.add({
      title: "Canvas renamed",
      description: `${canvas.title} is now ${data.title}.`,
      type: "success",
    });
  }

  async function deleteCanvasRecord(canvas: CanvasSummary) {
    const shouldDelete = window.confirm(
      `Delete "${canvas.title}"? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from("teaching_canvases")
      .delete()
      .eq("id", canvas.id);

    if (error) {
      toastManager.add({
        title: "Canvas not deleted",
        description: error.message,
        type: "error",
      });
      return;
    }

    removeCanvasSummary(canvas.id);
    toastManager.add({
      title: "Canvas deleted",
      description: `${canvas.title} was removed.`,
      type: "success",
    });
  }

  async function moveCanvasToProject(
    canvas: CanvasSummary,
    nextProjectId: string | null,
  ) {
    const previousProjectId = canvas.projectId;

    if (previousProjectId === nextProjectId) {
      return;
    }

    setMovingCanvasIds((current) => ({
      ...current,
      [canvas.id]: nextProjectId ?? "none",
    }));
    updateCanvasProjectLocally(canvas.id, nextProjectId);

    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from("teaching_canvases")
      .update({ project_id: nextProjectId })
      .eq("id", canvas.id);

    if (error) {
      updateCanvasProjectLocally(canvas.id, previousProjectId);
      toastManager.add({
        title: "Canvas not moved",
        description: error.message,
        type: "error",
      });
    } else {
      const destination = nextProjectId
        ? (availableProjects.find((project) => project.id === nextProjectId)
            ?.name ?? "the selected project")
        : "No project";

      toastManager.add({
        title: "Canvas moved",
        description: `Moved ${canvas.title} to ${destination}.`,
        type: "success",
      });
    }

    setMovingCanvasIds((current) => {
      const next = { ...current };
      delete next[canvas.id];
      return next;
    });
  }

  async function createCanvasFromTemplate() {
    setTemplateError(null);
    const template = createCanvasTemplate(selectedTemplateKey);
    const nextDocument = normalizeCanvasFrames(template.document);
    const title = topicSearch.trim() || template.title;
    const topic = topicSearch.trim() || template.title;
    const supabase = createSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setTemplateError("Please sign in again before creating a canvas.");
      return;
    }

    const payload = buildCanvasPayload({
      activeFrameId: getInitialSlideId(nextDocument),
      document: nextDocument,
      templateKey: selectedTemplateKey,
      title,
      topic,
    });

    const { data, error } = await supabase
      .from("teaching_canvases")
      .insert({
        ...payload,
        owner_id: user.id,
        project_id: projectContext?.id ?? null,
        share_slug: createShareSlug(),
      })
      .select("id")
      .single();

    if (error || !data) {
      setTemplateError(error?.message ?? "Could not create the canvas yet.");
      return;
    }

    setIsTemplateDialogOpen(false);
    startTransition(() => router.push(`/dashboard/canvas/${data.id}`));
  }

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden bg-background px-5 py-6 text-foreground">
      <div className="flex flex-col gap-4 py-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          {projectContext ? (
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 w-fit px-0 text-muted-foreground hover:text-foreground"
              render={<Link href="/dashboard/projects" />}
            >
              <ArrowLeftIcon className="size-4" />
              Back to projects
            </Button>
          ) : null}
          <div className="mb-4 flex items-center gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <PiChalkboardDuotone className="size-8" />
                <h1 className="text-3xl font-semibold tracking-tight">
                  {projectContext
                    ? `${projectContext.name} canvases`
                    : "Teaching canvases"}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTemplateSpotlights ? (
        <section className="flex gap-2">
          {canvasTemplateOptions.slice(0, 3).map((template) => (
            <button
              key={template.key}
              type="button"
              onClick={() => {
                setSelectedTemplateKey(template.key);
                setTopicSearch(createCanvasTemplate(template.key).title);
                setTemplateError(null);
                setIsTemplateDialogOpen(true);
              }}
              className="flex h-24 w-64 items-center justify-between overflow-hidden rounded-2xl bg-card px-2 pl-4 text-left shadow-[inset_0_0_0_1px_var(--border)] transition-[transform,box-shadow,background-color] hover:bg-accent active:scale-[0.98]"
            >
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">
                  {template.title}
                </p>
              </div>
              <Image
                src={template.image}
                alt={template.title}
                width={126}
                height={68}
                className="rounded-lg"
              />
            </button>
          ))}
        </section>
      ) : null}

      <CardFrame className="mt-4 w-full">
        <CardFrameHeader>
          <CardFrameTitle>Existing canvases</CardFrameTitle>
          <CardFrameAction>
            <Button variant="default" onClick={() => setIsTemplateDialogOpen(true)}>
              <PlusIcon className="size-4" />
              New canvas
            </Button>
          </CardFrameAction>
        </CardFrameHeader>
        <Card>
          <CardPanel>
            <div className="grid gap-2">
              {canvasRecords.length ? (
                canvasRecords.map((canvas) => (
                  <div
                    key={canvas.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition hover:border-primary/50 hover:bg-accent/40"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        startTransition(() =>
                          router.push(`/dashboard/canvas/${canvas.id}`),
                        )
                      }
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-border bg-muted/25 text-primary">
                        <PiChalkboardDuotone className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {canvas.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {canvas.topic || "Computer Science"} ·{" "}
                          {formatUpdatedAt(canvas.updatedAt)}
                        </p>
                      </div>
                    </button>

                    <Menu>
                      <MenuTrigger
                        render={
                          <button
                            type="button"
                            aria-label={`${canvas.title} actions`}
                            className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground"
                          />
                        }
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </MenuTrigger>
                      <MenuPopup align="end" side="bottom" className="min-w-40">
                        <MenuItem onClick={() => void renameCanvasRecord(canvas)}>
                          <PenLineIcon className="size-4" />
                          Rename
                        </MenuItem>
                        <MenuSub>
                          <MenuSubTrigger>
                            <BriefcaseBusinessIcon className="size-4" />
                            Move to project
                          </MenuSubTrigger>
                          <MenuSubPopup className="min-w-52">
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              {movingCanvasIds[canvas.id]
                                ? "Moving..."
                                : "Choose destination"}
                            </div>
                            <MenuItem
                              disabled={Boolean(movingCanvasIds[canvas.id])}
                              onClick={() =>
                                void moveCanvasToProject(canvas, null)
                              }
                            >
                              No project
                            </MenuItem>
                            {availableProjects.length ? <MenuSeparator /> : null}
                            {availableProjects.map((project) => (
                              <MenuItem
                                key={project.id}
                                disabled={
                                  Boolean(movingCanvasIds[canvas.id]) ||
                                  canvas.projectId === project.id
                                }
                                onClick={() =>
                                  void moveCanvasToProject(canvas, project.id)
                                }
                              >
                                {project.name}
                              </MenuItem>
                            ))}
                          </MenuSubPopup>
                        </MenuSub>
                        <MenuItem
                          variant="destructive"
                          onClick={() => void deleteCanvasRecord(canvas)}
                        >
                          <Trash2Icon className="size-4" />
                          Delete
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  </div>
                ))
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FolderIcon />
                    </EmptyMedia>
                    <EmptyTitle>
                      {projectContext
                        ? "No canvases in this project yet"
                        : "No canvases yet"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {projectContext
                        ? "Use New canvas to add the first teaching canvas to this project."
                        : "Pick one of the templates above to create your first teaching canvas."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </CardPanel>
        </Card>
      </CardFrame>

      <CanvasCreateDialog
        filteredTemplates={filteredTemplates}
        isPending={isPending}
        onCreate={() => void createCanvasFromTemplate()}
        onOpenChange={setIsTemplateDialogOpen}
        onTemplateSelect={setSelectedTemplateKey}
        onTopicSearchChange={setTopicSearch}
        open={isTemplateDialogOpen}
        selectedTemplateKey={selectedTemplateKey}
        templateError={templateError}
        topicSearch={topicSearch}
      />
    </section>
  );
}
