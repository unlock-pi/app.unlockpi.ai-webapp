"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  CircleHelpIcon,
  ChevronRightIcon,
  FolderIcon,
  HomeIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PenLineIcon,
  PlusIcon,
  Settings2Icon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

import { createClient } from "@/lib/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

type MainItem = {
  title: string
  url: string
  icon: LucideIcon
  subtitle?: string
}

type TeachingProject = {
  id: string
  owner_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

type TeachingSession = {
  id: string
  owner_id: string
  project_id: string
  title: string
  topic: string
  learning_goals: string
  lesson_structure: string
  content_outline: string | null
  status: string
  is_live: boolean
  created_at: string
  updated_at: string
}
import { RiQuestionAnswerFill } from "react-icons/ri";
import { VscCommentDiscussionSparkle } from "react-icons/vsc";

const topItems: MainItem[] = [
  // {
  //   title: "Discover",
  //   url: "/dashboard/discover",
  //   icon: SparklesIcon,
  // },
  {
    title: "Interviews",
    url: "/dashboard/interview",
    // icon: RiQuestionAnswerFill,
    // @ts-ignore
    icon: VscCommentDiscussionSparkle,
  },
  {
    title: "Home chat",
    url: "/dashboard",
    icon: HomeIcon,
    subtitle: "Hey, I'm Pi - your personal AI tutor",
  },
]

const quickAction = {
  title: "New session",
  url: "/dashboard/session/new",
  icon: PenLineIcon,
  hint: "Open session intake and start teaching flow",
}

const footerItems = [
  { title: "Help & feedback", icon: CircleHelpIcon, url: "#" },
  { title: "Settings", icon: Settings2Icon, url: "/dashboard/settings" },
]

function SidebarCollapseButton() {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {isCollapsed ? (
        <PanelLeftOpenIcon className="size-4" />
      ) : (
        <PanelLeftCloseIcon className="size-4" />
      )}
    </button>
  )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state: sidebarState, toggleSidebar } = useSidebar()
  const isSidebarCollapsed = sidebarState === "collapsed"

  const [projects, setProjects] = useState<TeachingProject[]>([])
  const [sessions, setSessions] = useState<TeachingSession[]>([])
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true)

  const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const handledQuickActionRef = useRef<string | null>(null)

  const sessionsByProject = useMemo(() => {
    const grouped = new Map<string, TeachingSession[]>()

    for (const session of sessions) {
      const projectSessions = grouped.get(session.project_id) ?? []
      projectSessions.push(session)
      grouped.set(session.project_id, projectSessions)
    }

    return grouped
  }, [sessions])

  const loadWorkspace = useCallback(async () => {
    setIsLoadingWorkspace(true)
    setWorkspaceError(null)

    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      setOwnerId(null)
      setProjects([])
      setSessions([])
      setIsLoadingWorkspace(false)
      return
    }

    setOwnerId(user.id)

    const [projectsRes, sessionsRes] = await Promise.all([
      supabase
        .from("teaching_projects")
        .select("id, owner_id, name, description, created_at, updated_at")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("teaching_sessions")
        .select(
          "id, owner_id, project_id, title, topic, learning_goals, lesson_structure, content_outline, status, is_live, created_at, updated_at"
        )
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
    ])

    const missingSchema =
      projectsRes.error?.code === "42P01" || sessionsRes.error?.code === "42P01"

    if (missingSchema) {
      setWorkspaceError(
        "Workspace tables are missing. Run supabase/migrations/20260409_teaching_workspace.sql and refresh."
      )
      setProjects([])
      setSessions([])
      setIsLoadingWorkspace(false)
      return
    }

    if (projectsRes.error || sessionsRes.error) {
      setWorkspaceError(
        projectsRes.error?.message ??
          sessionsRes.error?.message ??
          "Could not load teaching workspace."
      )
      setProjects([])
      setSessions([])
      setIsLoadingWorkspace(false)
      return
    }

    const fetchedProjects = (projectsRes.data ?? []) as TeachingProject[]
    const fetchedSessions = (sessionsRes.data ?? []) as TeachingSession[]

    setProjects(fetchedProjects)
    setSessions(fetchedSessions)
    setExpandedProjects((previous) => {
      if (Object.keys(previous).length > 0) {
        return previous
      }

      return fetchedProjects.reduce<Record<string, boolean>>((acc, project) => {
        acc[project.id] = true
        return acc
      }, {})
    })
    setIsLoadingWorkspace(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWorkspace()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadWorkspace])

  const openProjectSheet = useCallback(() => {
    setWorkspaceError(null)
    setIsProjectSheetOpen(true)
  }, [])

  useEffect(() => {
    const requestedQuickAction = searchParams.get("quickAction")

    if (!requestedQuickAction) {
      return
    }

    const key = `${pathname}?${searchParams.toString()}`
    if (handledQuickActionRef.current === key) {
      return
    }

    if (requestedQuickAction === "new-project") {
      handledQuickActionRef.current = key

      const timeoutId = window.setTimeout(() => {
        openProjectSheet()
      }, 0)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }
  }, [openProjectSheet, pathname, searchParams])

  const handleCreateProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = projectName.trim()

    if (!trimmedName) {
      setWorkspaceError("Project name is required.")
      return
    }

    if (!ownerId) {
      setWorkspaceError("Please sign in again before creating a project.")
      return
    }

    setIsSavingProject(true)
    const supabase = createClient()
    const { error } = await supabase.from("teaching_projects").insert({
      owner_id: ownerId,
      name: trimmedName,
      description: projectDescription.trim() || null,
    })

    if (error) {
      setWorkspaceError(error.message)
      setIsSavingProject(false)
      return
    }

    setProjectName("")
    setProjectDescription("")
    setIsProjectSheetOpen(false)
    setIsSavingProject(false)
    await loadWorkspace()
  }

  const activeSessionId = searchParams.get("session")

  return (
    <>
      <Sidebar
        collapsible="icon"
        className={cn(
          "**:data-[slot=sidebar-menu-button]:rounded-xl",
          "**:data-[slot=sidebar-menu-button]:text-sm **:data-[slot=sidebar-menu-button]:font-medium",
          "[&_[data-slot=sidebar-menu-button][data-active=true]]:bg-accent [&_[data-slot=sidebar-menu-button][data-active=true]]:text-accent-foreground"
        )}
        {...props}
      >
        <SidebarHeader className="border-b border-border px-3 py-3">
          <div
            className={cn(
              "flex items-center gap-2",
              isSidebarCollapsed ? "justify-center" : "justify-between"
            )}
          >
            <Link
              href="/dashboard"
              onClick={(event) => {
                if (!isSidebarCollapsed) {
                  return
                }

                event.preventDefault()
                toggleSidebar()
              }}
              className="group/logo relative flex min-w-0 items-center gap-2 rounded-md"
            >
              <Image
                src="/unlockpi-logo.png"
                alt="Unlock PI logo"
                width={30}
                height={30}
                className="size-7 rounded-md object-cover"
                priority
              />
              <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-md bg-sidebar-accent/85 text-sidebar-accent-foreground opacity-0 transition-opacity group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:group-hover/logo:opacity-100">
                <PanelLeftOpenIcon className="size-4" />
              </span>
              <span className="truncate text-base font-semibold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
                Unlock PI
              </span>
            </Link>
            <div className="group-data-[collapsible=icon]:hidden">
              <SidebarCollapseButton />
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2">
          <SidebarMenu className="gap-1 pt-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href={quickAction.url} />}
                tooltip={quickAction.title}
                className="h-auto min-h-10 items-start gap-2.5 py-2 group-data-[collapsible=icon]:items-center"
              >
                <quickAction.icon className="mt-0.5 size-4 shrink-0" />
                <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
                  <span className="truncate">{quickAction.title}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {quickAction.hint}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {topItems.map((item) => {
              const isActive =
                pathname === item.url ||
                (item.url !== "/dashboard" && pathname.startsWith(item.url))

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    tooltip={item.title}
                    isActive={isActive}
                    className={cn(
                      "h-auto min-h-10 items-start gap-2.5 py-2 group-data-[collapsible=icon]:items-center",
                      item.subtitle ? "min-h-14" : ""
                    )}
                  >
                    <item.icon className="mt-0.5 size-4 shrink-0" />
                    <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
                      <span className="truncate">{item.title}</span>
                      {item.subtitle ? (
                        <span className="truncate text-xs font-normal text-muted-foreground">
                          {item.subtitle}
                        </span>
                      ) : null}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>

          <SidebarGroup className="pt-4">
            <div className="flex items-center justify-between px-2">
              <SidebarGroupLabel className="p-0 text-[13px] font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">
                Projects
              </SidebarGroupLabel>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="group-data-[collapsible=icon]:hidden"
                onClick={openProjectSheet}
                aria-label="Create project"
              >
                <PlusIcon className="size-4" />
              </Button>
            </div>

            <SidebarMenu className="mt-2 gap-1">
              {isLoadingWorkspace ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <SidebarMenuItem key={`project-skeleton-${index}`}>
                    <div className="flex items-center gap-1 group-data-[collapsible=icon]:justify-center">
                      <SidebarMenuButton
                        aria-label="Loading project"
                        className="flex-1 group-data-[collapsible=icon]:flex-none"
                        disabled
                      >
                        <Skeleton className="size-4 shrink-0 rounded-sm" />
                        <Skeleton className="h-3.5 w-24 group-data-[collapsible=icon]:hidden" />
                        <Skeleton className="ml-auto h-3 w-6 group-data-[collapsible=icon]:hidden" />
                      </SidebarMenuButton>

                      <div className="flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                        <Skeleton className="size-8 rounded-lg" />
                        <Skeleton className="size-8 rounded-lg" />
                      </div>
                    </div>

                    <div className="mt-1 space-y-1.5 pl-8 pr-2 group-data-[collapsible=icon]:hidden">
                      <Skeleton className="h-6 w-full rounded-md" />
                      <Skeleton className="h-6 w-4/5 rounded-md" />
                    </div>
                  </SidebarMenuItem>
                ))
              ) : null}

              {!isLoadingWorkspace && projects.length === 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Create your first project" onClick={openProjectSheet}>
                    <FolderIcon className="size-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      No projects yet
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}

              {!isLoadingWorkspace
                ? projects.map((project) => {
                    const projectHref = `/dashboard/project/${project.id}`
                    const projectSessions = sessionsByProject.get(project.id) ?? []
                    const isExpanded = expandedProjects[project.id] ?? true
                    const isProjectActive = pathname === projectHref

                    return (
                      <Collapsible
                        key={project.id}
                        open={isExpanded}
                        onOpenChange={(open) =>
                          setExpandedProjects((previous) => ({
                            ...previous,
                            [project.id]: open,
                          }))
                        }
                        className="group/collapsible"
                      >
                        <SidebarMenuItem>
                          <div className="flex items-center gap-1 group-data-[collapsible=icon]:justify-center">
                            <SidebarMenuButton
                              render={<Link href={projectHref} />}
                              tooltip={project.name}
                              isActive={isProjectActive}
                              className="flex-1 group-data-[collapsible=icon]:flex-none"
                            >
                              <FolderIcon className="size-4 shrink-0" />
                              <span className="truncate group-data-[collapsible=icon]:hidden">
                                {project.name}
                              </span>
                              <span className="ml-auto text-[11px] text-muted-foreground group-data-[collapsible=icon]:hidden">
                                {projectSessions.length}
                              </span>
                            </SidebarMenuButton>

                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="group-data-[collapsible=icon]:hidden"
                              render={<Link href={`/dashboard/session/new?project_id=${project.id}`} />}
                              aria-label={`Create session in ${project.name}`}
                            >
                              <PlusIcon className="size-4" />
                            </Button>

                            <CollapsibleTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  className="group-data-[collapsible=icon]:hidden"
                                  aria-label={`Toggle ${project.name} sessions`}
                                />
                              }
                            >
                              <ChevronRightIcon className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </CollapsibleTrigger>
                          </div>

                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {projectSessions.length === 0 ? (
                                <SidebarMenuSubItem>
                                  <span className="block px-2 py-1 text-xs text-muted-foreground">
                                    No sessions yet
                                  </span>
                                </SidebarMenuSubItem>
                              ) : null}

                              {projectSessions.map((session) => {
                                const sessionHref = `${projectHref}?session=${session.id}`
                                const isActiveSession =
                                  pathname === projectHref && activeSessionId === session.id

                                return (
                                  <SidebarMenuSubItem key={session.id}>
                                    <SidebarMenuSubButton
                                      render={<Link href={sessionHref} />}
                                      isActive={isActiveSession}
                                    >
                                      <span className="truncate">{session.title}</span>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    )
                  })
                : null}
            </SidebarMenu>
          </SidebarGroup>

          {workspaceError ? (
            <div className="px-2 pt-2 text-xs text-destructive group-data-[collapsible=icon]:hidden">
              {workspaceError}
            </div>
          ) : null}
        </SidebarContent>

        <SidebarFooter className="mt-auto border-t border-border px-2 py-3">
          <SidebarMenu className="gap-1">
            {footerItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<a href={item.url} />}
                  tooltip={item.title}
                  className="h-10 gap-2.5 group-data-[collapsible=icon]:justify-center"
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <Dialog open={isProjectSheetOpen} onOpenChange={setIsProjectSheetOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateProject} className="flex h-full flex-col">
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
              <DialogDescription>
                Organize sessions by class, unit, or term. Create once, then keep
                all project chats grouped together.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 px-4 pb-4">
              <div className="grid gap-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  className="border border-border bg-background"
                  placeholder="Grade 8 - Algebra Foundations"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project-description">Description (optional)</Label>
                <Textarea
                  id="project-description"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  className="min-h-24 border border-border bg-background"
                  placeholder="Scope, pacing, and classroom objectives for this project."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProjectSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingProject}>
                {isSavingProject ? "Creating..." : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
