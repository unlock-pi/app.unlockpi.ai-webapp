import Link from "next/link"
import { redirect } from "next/navigation"

import { ArrowRightIcon, FolderIcon, Layers3Icon, PenLineIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateProjectDialog } from "@/features/project/components/create-project-dialog"
import { formatDate } from "@/features/project/lib/project-lib"
import type { TeachingProject, TeachingSession } from "@/features/project/types/project-types"
import { createClient } from "@/lib/server"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const [projectsRes, sessionsRes] = await Promise.all([
    supabase
      .from("teaching_projects")
      .select("id, owner_id, name, description, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("teaching_sessions")
      .select("id, owner_id, project_id, title, topic, learning_goals, lesson_structure, content_outline, status, is_live, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false }),
  ])

  const projects = (projectsRes.data ?? []) as TeachingProject[]
  const sessions = (sessionsRes.data ?? []) as TeachingSession[]

  const sessionCounts = sessions.reduce<Record<string, number>>((acc, session) => {
    acc[session.project_id] = (acc[session.project_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.14)] md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Projects</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your teaching workspace</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Projects and sessions now live here instead of the sidebar. Open a project to review
              its sessions, edit them, and jump into talk mode from one place.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <CreateProjectDialog />
          <Button variant="outline" render={<Link href="/dashboard/session/new" />}>
            <PenLineIcon className="size-4" />
            New session
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="border-border/70">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-center gap-3">
              <FolderIcon className="size-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-tight">No projects yet</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Create your first project to organize sessions by class, unit, or term.
            </p>
            <div>
              <CreateProjectDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="border-border/70 bg-card/70">
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{project.name}</CardTitle>
                    <CardDescription className="line-clamp-3 text-sm leading-6">
                      {project.description || "This project groups related teaching sessions together."}
                    </CardDescription>
                  </div>
                  <FolderIcon className="mt-1 size-5 text-muted-foreground" />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <Layers3Icon className="mr-1 size-3" />
                    {sessionCounts[project.id] ?? 0} sessions
                  </Badge>
                  <Badge variant="secondary">Updated {formatDate(project.updated_at)}</Badge>
                </div>
              </CardHeader>

              <CardContent className="flex items-center justify-between gap-3">
                <Button variant="ghost" render={<Link href={`/dashboard/project/${project.id}`} />}>
                  Open project
                  <ArrowRightIcon className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/dashboard/session/new?project_id=${project.id}`} />}
                >
                  <PenLineIcon className="size-4" />
                  New session
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
