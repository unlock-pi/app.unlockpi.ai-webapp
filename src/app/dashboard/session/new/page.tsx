import { redirect } from "next/navigation"

import { NewSessionPageClient } from "@/features/session/components/new-session-page-client"
import type { TeachingProject } from "@/features/session/types/session-types"
import { createClient } from "@/lib/server"

type PageProps = {
  searchParams: Promise<{ project_id?: string; template?: string }>
}

export default async function NewSessionPage({ searchParams }: PageProps) {
  const [{ project_id: initialProjectId = "", template: requestedTemplate = "" }, supabase] =
    await Promise.all([searchParams, createClient()])
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data, error } = await supabase
    .from("teaching_projects")
    .select("id, name, description")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const projects = (data ?? []) as TeachingProject[]

  return (
    <NewSessionPageClient
      ownerId={user.id}
      projects={projects}
      initialProjectId={initialProjectId}
      requestedTemplate={requestedTemplate}
    />
  )
}
