"use client"

import { FormEvent, KeyboardEvent, useState } from "react"
import { useRouter } from "next/navigation"

import {
  AlertTriangleIcon,
  ArrowRightIcon,
  EllipsisVertical,
  FolderIcon,
  Layers3Icon,
  PencilLineIcon,
  Share2Icon,
  ArchiveIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu"
import type { TeachingProject } from "@/features/project/types/project-types"
import { createClient } from "@/lib/client"

type ProjectsGridProps = {
  projects: TeachingProject[]
  canvasCounts: Record<string, number>
}

export function ProjectsGrid({ projects, canvasCounts }: ProjectsGridProps) {
  return (
    <div className="mt-4 grid gap-x-4 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectFolderCard
          key={project.id}
          project={project}
          canvasCount={canvasCounts[project.id] ?? 0}
        />
      ))}
    </div>
  )
}

type ProjectFolderCardProps = {
  project: TeachingProject
  canvasCount: number
}

function ProjectFolderCard({ project, canvasCount }: ProjectFolderCardProps) {
  const router = useRouter()
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [name, setName] = useState(project.name)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const openProject = () => {
    router.push(`/dashboard/project/${project.id}`)
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      openProject()
    }
  }

  const stopCardNavigation = (event: { stopPropagation: () => void }) => {
    event.stopPropagation()
  }

  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      toast.error("Project name is required.")
      return
    }

    setIsRenaming(true)

    const supabase = createClient()
    const { error } = await supabase
      .from("teaching_projects")
      .update({ name: trimmedName })
      .eq("id", project.id)
      .eq("owner_id", project.owner_id)

    if (error) {
      toast.error(error.message || "Unable to rename project.")
      setIsRenaming(false)
      return
    }

    toast.success("Project renamed.")
    setIsRenaming(false)
    setIsRenameOpen(false)
    router.refresh()
  }

  const handleDelete = async () => {
    setIsDeleting(true)

    const supabase = createClient()
    const { error } = await supabase
      .from("teaching_projects")
      .delete()
      .eq("id", project.id)
      .eq("owner_id", project.owner_id)

    if (error) {
      toast.error(error.message || "Unable to delete project.")
      setIsDeleting(false)
      return
    }

    toast.success("Project deleted.")
    setIsDeleting(false)
    setIsDeleteOpen(false)
    router.refresh()
  }

  return (
    <>
      <div
        role="link"
        tabIndex={0}
        aria-label={`Open project ${project.name}`}
        className="group cursor-pointer outline-none"
        onClick={openProject}
        onKeyDown={handleCardKeyDown}
      >
        <Card className="relative h-40 w-80 rounded-none rounded-b-lg! rounded-r-lg! border-border/70 bg-foreground text-white transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-muted">
          <div className="absolute -top-3 h-5 w-10 rounded-tl-lg rounded-tr-lg bg-foreground" />
          <div className="absolute top-[2px] left-[24px] h-5 w-10 rotate-45 bg-foreground" />

          <CardHeader className="gap-0 pb-0!">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2 max-w-[13rem] text-sm leading-5 text-white/65 dark:text-muted-foreground">
                  {project.description || "Open this project to see and manage all of its teaching canvases."}
                </CardDescription>
              </div>

              <div
                className="relative z-10"
                onClick={stopCardNavigation}
                onPointerDown={stopCardNavigation}
                onKeyDown={stopCardNavigation}
              >
                <Menu>
                  <MenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground dark:hover:bg-white/10 dark:hover:text-white"
                      />
                    }
                  >
                    <EllipsisVertical className="size-4" />
                  </MenuTrigger>
                  <MenuPopup align="end" className="w-44">
                    <MenuItem
                      onClick={() => {
                        setName(project.name)
                        setIsRenameOpen(true)
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
                    <MenuSeparator />
                    <MenuItem
                      variant="destructive"
                      onClick={() => setIsDeleteOpen(true)}
                    >
                      <Trash2Icon className="size-4" />
                      Delete
                    </MenuItem>
                  </MenuPopup>
                </Menu>
              </div>
            </div>
          </CardHeader>

          <CardPanel className="flex items-center justify-between gap-3 pb-1">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="px-1">
                <Layers3Icon className="mr-1 size-3" />
                {canvasCount} canvases
              </Badge>
            </div>

            <div className="hidden transition-all duration-300 group-hover:flex items-center gap-2 text-xs text-white/55 dark:text-muted-foreground">
              <FolderIcon className="size-3.5" />
              <span>Open</span>
              <ArrowRightIcon className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </div>
          </CardPanel>
        </Card>
      </div>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogPopup className="max-w-md">
          <form onSubmit={handleRename} className="grid gap-0">
            <DialogHeader>
              <DialogTitle>Rename project</DialogTitle>
              <DialogDescription>
                Give this project a clearer name without leaving the projects page.
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
              This will remove <span className="font-medium text-foreground">{project.name}</span>.
              If there are linked records that block deletion, we will keep the project and show the
              database error instead.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="px-6 pb-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <span>This action is intended to be destructive and cannot be silently undone.</span>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete project"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
