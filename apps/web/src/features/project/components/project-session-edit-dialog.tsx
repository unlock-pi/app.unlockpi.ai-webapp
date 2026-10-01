"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SessionDraftForm } from "@/features/session/components/session-draft-form"
import {
  createSessionDraftFromSession,
  teachingSessionSelect,
} from "@/features/session/lib/session-lib"
import type { TeachingProject } from "@/features/project/types/project-types"
import type { SessionDraft, TeachingSession } from "@/features/session/types/session-types"

type ProjectSessionEditDialogProps = {
  open: boolean
  project: TeachingProject
  session: TeachingSession | null
  onOpenChange: (open: boolean) => void
  onSaved: (session: TeachingSession) => void
}

export function ProjectSessionEditDialog({
  open,
  project,
  session,
  onOpenChange,
  onSaved,
}: ProjectSessionEditDialogProps) {
  const { refresh } = useRouter()
  const [draft, setDraft] = useState<SessionDraft | null>(() =>
    session ? createSessionDraftFromSession(session) : null
  )
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!session || !draft) {
      return
    }

    const requiredFields: Array<[string, string]> = [
      ["topic", draft.topic.trim()],
      ["title", draft.title.trim()],
      ["learning goals", draft.learning_goals.trim()],
      ["lesson structure", draft.lesson_structure.trim()],
    ]

    const missingField = requiredFields.find(([, value]) => !value)
    if (missingField) {
      setErrorMessage(`Please provide ${missingField[0]} before saving the session.`)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("teaching_sessions")
      .update({
        title: draft.title.trim(),
        topic: draft.topic.trim(),
        learning_goals: draft.learning_goals.trim(),
        lesson_structure: draft.lesson_structure.trim(),
        content_outline: draft.content_outline.trim() || null,
      })
      .eq("id", session.id)
      .eq("project_id", project.id)
      .select(teachingSessionSelect)
      .single()

    if (error || !data) {
      setErrorMessage(error?.message ?? "Unable to update session.")
      setIsSaving(false)
      return
    }

    const updatedSession = data as TeachingSession
    setDraft(createSessionDraftFromSession(updatedSession))
    setIsSaving(false)
    refresh()
    onSaved(updatedSession)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            Update the session details without leaving the project workspace.
          </DialogDescription>
        </DialogHeader>

        {session && draft ? (
          <SessionDraftForm
            draft={draft}
            projects={[project]}
            isSaving={isSaving}
            submitLabel="Save changes"
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
            onDraftChange={setDraft}
            onCancel={() => onOpenChange(false)}
            showProjectSelect={false}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
