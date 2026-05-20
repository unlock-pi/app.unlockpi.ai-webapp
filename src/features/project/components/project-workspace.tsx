"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import {
  CalendarClockIcon,
  FolderIcon,
  MessageSquareIcon,
  PenLineIcon,
  PresentationIcon,
  TargetIcon,
} from "lucide-react"

import { createClient } from "@/lib/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SessionDraftForm } from "@/features/session/components/session-draft-form"
import { createSessionDraftFromSession } from "@/features/session/lib/session-lib"
import type { SessionDraft, TeachingProject, TeachingSession } from "@/features/session/types/session-types"
import { formatDate } from "@/features/project/lib/project-lib"
import { cn } from "@/lib/utils"

type ProjectWorkspaceProps = {
  project: TeachingProject
  sessions: TeachingSession[]
  initialSessionId?: string | null
}

export function ProjectWorkspace({
  project,
  sessions: initialSessions,
  initialSessionId,
}: ProjectWorkspaceProps) {
  const pathname = usePathname()
  const { replace, refresh } = useRouter()

  const [sessions, setSessions] = useState(initialSessions)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessionId ?? initialSessions[0]?.id ?? null
  )
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draft, setDraft] = useState<SessionDraft | null>(null)

  useEffect(() => {
    setSessions(initialSessions)
  }, [initialSessions])

  useEffect(() => {
    setSelectedSessionId(initialSessionId ?? initialSessions[0]?.id ?? null)
  }, [initialSessionId, initialSessions])

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? sessions[0] ?? null

  useEffect(() => {
    if (!selectedSession) {
      setDraft(null)
      setIsEditing(false)
      return
    }

    setDraft(createSessionDraftFromSession(selectedSession))
  }, [selectedSession])

  const selectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setIsEditing(false)
    setErrorMessage(null)
    replace(`${pathname}?session=${sessionId}`, { scroll: false })
  }

  const handleSaveSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedSession || !draft) {
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
      .eq("id", selectedSession.id)
      .eq("project_id", project.id)
      .select(
        "id, owner_id, project_id, title, topic, learning_goals, lesson_structure, content_outline, status, is_live, created_at, updated_at"
      )
      .single()

    if (error || !data) {
      setErrorMessage(error?.message ?? "Unable to update session.")
      setIsSaving(false)
      return
    }

    const updatedSession = data as TeachingSession
    setSessions((previous) =>
      previous.map((session) => (session.id === updatedSession.id ? updatedSession : session))
    )
    setDraft(createSessionDraftFromSession(updatedSession))
    setIsEditing(false)
    setIsSaving(false)
    refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="border-border/70">
        <CardHeader className="border-b">
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Open a session to review it, then edit from the main workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 p-4">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              No sessions yet. Create your first teaching session for this project.
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = selectedSession?.id === session.id

              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => selectSession(session.id)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/8"
                      : "border-border bg-background hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="truncate text-sm font-medium">{session.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{session.topic}</p>
                    </div>
                    <Badge variant={isActive ? "default" : "outline"}>{session.status}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Updated {formatDate(session.updated_at)}
                  </p>
                </button>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle>{selectedSession ? selectedSession.title : "Session details"}</CardTitle>
              <CardDescription>
                {selectedSession
                  ? "Review the current session or switch into edit mode."
                  : "Choose a session from the list to see its teaching details."}
              </CardDescription>
            </div>

            {selectedSession ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setIsEditing((previous) => !previous)}>
                  <PenLineIcon className="size-4" />
                  {isEditing ? "Close editor" : "Edit session"}
                </Button>
                <Button
                  render={
                    <Link
                      href={`/dashboard/talk?projectId=${project.id}&sessionId=${selectedSession.id}`}
                    />
                  }
                >
                  <PresentationIcon className="size-4" />
                  Present mode
                </Button>
              </div>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-4">
          {!selectedSession ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              This project has no sessions yet. Create one to start building your teaching flow.
            </div>
          ) : isEditing && draft ? (
            <SessionDraftForm
              draft={draft}
              projects={[project]}
              isSaving={isSaving}
              submitLabel="Save changes"
              errorMessage={errorMessage}
              onSubmit={handleSaveSession}
              onDraftChange={setDraft}
              onCancel={() => {
                setDraft(createSessionDraftFromSession(selectedSession))
                setIsEditing(false)
                setErrorMessage(null)
              }}
              showProjectSelect={false}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{selectedSession.topic}</Badge>
                <Badge variant="outline">{selectedSession.status}</Badge>
                <Badge variant="outline">
                  <CalendarClockIcon className="mr-1 size-3" />
                  {formatDate(selectedSession.created_at)}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <TargetIcon className="size-4" />
                    Learning goals
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {selectedSession.learning_goals}
                  </p>
                </div>

                <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquareIcon className="size-4" />
                    Lesson structure
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {selectedSession.lesson_structure}
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-border bg-muted/20 p-4">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <FolderIcon className="size-4" />
                  Content outline
                </h3>
                <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {selectedSession.content_outline || "No extra outline provided for this session."}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
