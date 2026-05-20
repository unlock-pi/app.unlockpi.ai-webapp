"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"

import { ArrowLeftIcon } from "lucide-react"

import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SessionDraftForm } from "@/features/session/components/session-draft-form"
import { emptySessionDraft, templateDefaults } from "@/features/session/lib/session-lib"
import type { SessionDraft, TeachingProject } from "@/features/session/types/session-types"

type NewSessionPageClientProps = {
  ownerId: string
  projects: TeachingProject[]
  initialProjectId: string
  requestedTemplate: string
}

export function NewSessionPageClient({
  ownerId,
  projects,
  initialProjectId,
  requestedTemplate,
}: NewSessionPageClientProps) {
  const { push } = useRouter()
  const selectedTemplate = templateDefaults[requestedTemplate]
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>({
    ...emptySessionDraft,
    ...selectedTemplate,
    project_id: initialProjectId || projects[0]?.id || "",
  })

  const handleCreateSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const requiredFields: Array<[string, string]> = [
      ["project", sessionDraft.project_id],
      ["topic", sessionDraft.topic.trim()],
      ["title", sessionDraft.title.trim()],
      ["learning goals", sessionDraft.learning_goals.trim()],
      ["lesson structure", sessionDraft.lesson_structure.trim()],
    ]

    const missingField = requiredFields.find(([, value]) => !value)
    if (missingField) {
      setErrorMessage(`Please provide ${missingField[0]} before creating a session.`)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("teaching_sessions")
      .insert({
        owner_id: ownerId,
        project_id: sessionDraft.project_id,
        topic: sessionDraft.topic.trim(),
        title: sessionDraft.title.trim(),
        learning_goals: sessionDraft.learning_goals.trim(),
        lesson_structure: sessionDraft.lesson_structure.trim(),
        content_outline: sessionDraft.content_outline.trim() || null,
        status: "draft",
        is_live: false,
      })
      .select("id")
      .single()

    if (error || !data?.id) {
      setErrorMessage(error?.message ?? "Unable to create session.")
      setIsSaving(false)
      return
    }

    push(`/dashboard/project/${sessionDraft.project_id}?session=${data.id}`)
  }

  const backHref = sessionDraft.project_id
    ? `/dashboard/project/${sessionDraft.project_id}`
    : "/dashboard/projects"

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-4 md:px-6 md:py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" render={<Link href={backHref} />}>
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader className="border-b">
          <div className="relative h-40 overflow-hidden rounded-t-2xl">
            <Image
              className="absolute -top-10"
              src="/teacher-students-banner.png"
              alt="Teacher empowering students"
              width={900}
              height={205}
            />
            <CardTitle className="absolute top-6 left-4 text-2xl text-black">New Session</CardTitle>
            <CardDescription className="absolute top-14 left-4 max-w-sm text-black/60">
              Fill these prompts to create a structured session inside your selected project.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {projects.length === 0 ? (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground">
                You need at least one project before creating a session.
              </p>
              <Button variant="default" render={<Link href="/dashboard/projects" />}>
                Go to projects
              </Button>
            </div>
          ) : (
            <SessionDraftForm
              draft={sessionDraft}
              projects={projects}
              isSaving={isSaving}
              submitLabel="Create session"
              errorMessage={errorMessage}
              onSubmit={handleCreateSession}
              onDraftChange={setSessionDraft}
              cancelHref={backHref}
            />
          )}
        </CardContent>
      </Card>
    </section>
  )
}
