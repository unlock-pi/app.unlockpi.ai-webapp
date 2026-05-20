import Link from "next/link"
import Image from "next/image"
import { notFound, redirect } from "next/navigation"

import { FolderIcon, PenLineIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProjectWorkspace } from "@/features/project/components/project-workspace"
import { formatDate } from "@/features/project/lib/project-lib"
import type { TeachingProject } from "@/features/project/types/project-types"
import type { TeachingSession } from "@/features/session/types/session-types"
import { createClient } from "@/lib/server"

type PageProps = {
  params: Promise<{ project_id: string }>
  searchParams: Promise<{ session?: string }>
}

export default async function ProjectDetailPage({ params, searchParams }: PageProps) {
  const [{ project_id }, { session: activeSessionId }, supabase] = await Promise.all([
    params,
    searchParams,
    createClient(),
  ])
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const [projectRes, sessionRes] = await Promise.all([
    supabase
      .from("teaching_projects")
      .select("id, owner_id, name, description, created_at, updated_at")
      .eq("owner_id", user.id)
      .eq("id", project_id)
      .single(),
    supabase
      .from("teaching_sessions")
      .select(
        "id, owner_id, project_id, title, topic, learning_goals, lesson_structure, content_outline, status, is_live, created_at, updated_at"
      )
      .eq("owner_id", user.id)
      .eq("project_id", project_id)
      .order("updated_at", { ascending: false }),
  ])

  const { data: projectData, error: projectError } = projectRes
  const { data: sessionData, error: sessionError } = sessionRes

  if (projectError || !projectData) {
    notFound()
  }

  if (sessionError) {
    notFound()
  }

  const project = projectData as TeachingProject
  const sessions = (sessionData ?? []) as TeachingSession[]

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-6 rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.14)] lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <Link href="/dashboard/projects" className="text-sm text-muted-foreground hover:text-foreground">
            Back to projects
          </Link>
          <div className="flex items-center gap-2">
            <FolderIcon className="size-4 text-muted-foreground" />
            <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {project.description || "This project groups all related teaching sessions together."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{sessions.length} sessions</Badge>
            <Badge variant="secondary">Updated {formatDate(project.updated_at)}</Badge>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="hidden md:block">
            <Image
              src="/thought-time.png"
              alt="Teacher visual"
              width={180}
              height={180}
              className="object-contain"
            />
          </div>
          <Button render={<Link href={`/dashboard/session/new?project_id=${project.id}`} />}>
            <PenLineIcon className="size-4" />
            New session
          </Button>
        </div>
      </div>

      <ProjectWorkspace
        project={project}
        sessions={sessions}
        initialSessionId={activeSessionId ?? null}
      />
    </section>
  )
}
