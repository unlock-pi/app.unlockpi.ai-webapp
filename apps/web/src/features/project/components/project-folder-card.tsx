"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangleIcon,
  ArchiveIcon,
  EllipsisVertical,
  FolderIcon,
  PencilLineIcon,
  Share2Icon,
  Trash2Icon,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerMenu,
  DrawerMenuGroup,
  DrawerMenuGroupLabel,
  DrawerMenuItem,
  DrawerMenuSeparator,
  DrawerPanel,
  DrawerPopup,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { getProjectTint } from "@/features/project/lib/project-colors";
import type { TeachingProject } from "@/features/project/types/project-types";
import { useMediaQuery } from "@/features/talk/hooks/use-media-query";
import { toastManager } from "@/components/ui/toast";
import { createClient } from "@/lib/client";
import { cn } from "@/lib/utils";

export type ProjectFolderCardProps = {
  project: TeachingProject;
  canvasCount: number;
  className?: string;
};

/**
 * Compact, self-contained "folder" tile for a project — name, canvas count,
 * a soft per-project tint, and its own rename/delete actions. Reusable
 * anywhere a project needs to be represented as a single unit (projects
 * grid today; a project picker or sidebar later).
 */
export function ProjectFolderCard({
  project,
  canvasCount,
  className,
}: ProjectFolderCardProps) {
  const router = useRouter();
  const isMobile = useMediaQuery("max-md");
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const tint = getProjectTint(project.id);

  const openProject = () => {
    router.push(`/dashboard/project/${project.id}`);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProject();
    }
  };

  const stopCardNavigation = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };

  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      toastManager.add({
        title: "Project name required",
        description: "Add a project name before saving.",
        type: "error",
      });
      return;
    }

    setIsRenaming(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("teaching_projects")
      .update({ name: trimmedName })
      .eq("id", project.id)
      .eq("owner_id", project.owner_id);

    if (error) {
      toastManager.add({
        title: "Project not renamed",
        description: error.message || "Unable to rename project.",
        type: "error",
      });
      setIsRenaming(false);
      return;
    }

    toastManager.add({
      title: "Project renamed",
      description: `${project.name} is now ${trimmedName}.`,
      type: "success",
    });
    setIsRenaming(false);
    setIsRenameOpen(false);
    router.refresh();
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("teaching_projects")
      .delete()
      .eq("id", project.id)
      .eq("owner_id", project.owner_id);

    if (error) {
      toastManager.add({
        title: "Project not deleted",
        description: error.message || "Unable to delete project.",
        type: "error",
      });
      setIsDeleting(false);
      return;
    }

    toastManager.add({
      title: "Project deleted",
      description: `${project.name} was removed.`,
      type: "success",
    });
    setIsDeleting(false);
    setIsDeleteOpen(false);
    router.refresh();
  };

  const actionTrigger = (
    <Button
      variant="ghost"
      size="icon-sm"
      className="rounded-lg text-foreground/60 hover:bg-background/60 hover:text-foreground"
    />
  );

  return (
    <>
      <div
        role="link"
        tabIndex={0}
        aria-label={`Open project ${project.name}`}
        onClick={openProject}
        onKeyDown={handleCardKeyDown}
        className={cn(
          "group flex w-fit min-w-[240px] max-w-xs cursor-pointer items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          tint.surface,
          className,
        )}
      >
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/70",
            tint.icon,
          )}
        >
          <FolderIcon className="size-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {project.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {canvasCount} {canvasCount === 1 ? "canvas" : "canvases"}
          </p>
        </div>

        <div
          className="relative z-10 shrink-0"
          onClick={stopCardNavigation}
          onPointerDown={stopCardNavigation}
          onKeyDown={stopCardNavigation}
        >
          {isMobile ? (
            <Drawer>
              <DrawerTrigger render={actionTrigger}>
                <EllipsisVertical className="size-4" />
              </DrawerTrigger>
              <DrawerPopup showBar>
                <DrawerPanel>
                  <DrawerMenu>
                    <DrawerMenuGroup>
                      <DrawerMenuGroupLabel>Actions</DrawerMenuGroupLabel>
                      <DrawerClose
                        render={
                          <DrawerMenuItem
                            onClick={() => {
                              setName(project.name);
                              setIsRenameOpen(true);
                            }}
                          />
                        }
                      >
                        <PencilLineIcon className="size-4" />
                        Rename
                      </DrawerClose>
                      <DrawerMenuItem disabled>
                        <ArchiveIcon className="size-4" />
                        Archive
                      </DrawerMenuItem>
                      <DrawerMenuItem disabled>
                        <Share2Icon className="size-4" />
                        Share
                      </DrawerMenuItem>
                    </DrawerMenuGroup>
                    <DrawerMenuSeparator />
                    <DrawerMenuGroup>
                      <DrawerMenuGroupLabel>Danger zone</DrawerMenuGroupLabel>
                      <DrawerClose
                        render={
                          <DrawerMenuItem
                            variant="destructive"
                            onClick={() => setIsDeleteOpen(true)}
                          />
                        }
                      >
                        <Trash2Icon className="size-4" />
                        Delete
                      </DrawerClose>
                    </DrawerMenuGroup>
                  </DrawerMenu>
                </DrawerPanel>
              </DrawerPopup>
            </Drawer>
          ) : (
            <Menu>
              <MenuTrigger render={actionTrigger}>
                <EllipsisVertical className="size-4" />
              </MenuTrigger>
              <MenuPopup align="end" className="w-44">
                <MenuGroup>
                  <MenuGroupLabel>Actions</MenuGroupLabel>
                  <MenuItem
                    onClick={() => {
                      setName(project.name);
                      setIsRenameOpen(true);
                    }}
                  >
                    <PencilLineIcon className="size-4" />
                    Rename
                  </MenuItem>
                  <MenuItem disabled>
                    <ArchiveIcon className="size-4" />
                    Archive
                  </MenuItem>
                  <MenuItem disabled>
                    <Share2Icon className="size-4" />
                    Share
                  </MenuItem>
                </MenuGroup>
                <MenuSeparator />
                <MenuGroup>
                  <MenuGroupLabel>Danger zone</MenuGroupLabel>
                  <MenuItem
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2Icon className="size-4" />
                    Delete
                  </MenuItem>
                </MenuGroup>
              </MenuPopup>
            </Menu>
          )}
        </div>
      </div>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogPopup className="max-w-md">
          <form onSubmit={handleRename} className="grid gap-0">
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>
                Give this project a clearer name without leaving the projects
                page.
              </DialogDescription>
            </DialogHeader>

            <DialogPanel className="grid gap-2">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Grade 8 Algebra"
                autoFocus
              />
            </DialogPanel>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit" disabled={isRenaming}>
                {isRenaming ? "Saving..." : "Save name"}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-medium text-foreground">
                {project.name}
              </span>
              . If there are linked records that block deletion, we will keep
              the project and show the database error instead.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="px-6 pb-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span>
                This action is intended to be destructive and cannot be silently
                undone.
              </span>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogClose
              render={<Button variant="outline">Cancel</Button>}
            />
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete project"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
