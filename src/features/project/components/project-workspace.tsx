"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClockIcon,
  FolderIcon,
  MessageSquareIcon,
  PenLineIcon,
  PresentationIcon,
  TargetIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/client";
import { SessionDraftForm } from "@/features/session/components/session-draft-form";
import { createSessionDraftFromSession } from "@/features/session/lib/session-lib";
import type { TeachingProject } from "@/features/project/types/project-types";
import type { SessionDraft, TeachingSession } from "@/features/session/types/session-types";
import { formatDate } from "@/features/project/lib/project-lib";

type ProjectWorkspaceProps = {
  project: TeachingProject;
  sessions: TeachingSession[];
  initialSessionId?: string | null;
};

type SessionEditorProps = {
  project: TeachingProject;
  session: TeachingSession;
  onSaved: (session: TeachingSession) => void;
  onCancel: () => void;
};

export function ProjectWorkspace({
  project,
  sessions: initialSessions,
  initialSessionId,
}: ProjectWorkspaceProps) {
  const [sessionOverrides, setSessionOverrides] = useState<Record<string, TeachingSession>>({});
  const [isEditing, setIsEditing] = useState(false);

  const sessions = useMemo(
    () =>
      initialSessions.map((session) => {
        return sessionOverrides[session.id] ?? session;
      }),
    [initialSessions, sessionOverrides]
  );

  const selectedSession =
    sessions.find((session) => session.id === initialSessionId) ?? sessions[0] ?? null;

  return (
    <div className="gap-6">
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
          ) : isEditing ? (
            <SessionEditor
              key={selectedSession.id}
              project={project}
              session={selectedSession}
              onSaved={(updatedSession) => {
                setSessionOverrides((previous) => ({
                  ...previous,
                  [updatedSession.id]: updatedSession,
                }));
                setIsEditing(false);
              }}
              onCancel={() => setIsEditing(false)}
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

              <div className="gap-4">
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
                  <p className="truncate whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {selectedSession.lesson_structure.slice(0, 200) ||
                      "No lesson structure provided yet."}
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
  );
}

function SessionEditor({ project, session, onSaved, onCancel }: SessionEditorProps) {
  const { refresh } = useRouter();
  const [draft, setDraft] = useState<SessionDraft>(() => createSessionDraftFromSession(session));
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requiredFields: Array<[string, string]> = [
      ["topic", draft.topic.trim()],
      ["title", draft.title.trim()],
      ["learning goals", draft.learning_goals.trim()],
      ["lesson structure", draft.lesson_structure.trim()],
    ];

    const missingField = requiredFields.find(([, value]) => !value);
    if (missingField) {
      setErrorMessage(`Please provide ${missingField[0]} before saving the session.`);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const supabase = createClient();
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
      .select(
        "id, owner_id, project_id, title, topic, learning_goals, lesson_structure, content_outline, status, is_live, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      setErrorMessage(error?.message ?? "Unable to update session.");
      setIsSaving(false);
      return;
    }

    const updatedSession = data as TeachingSession;
    setDraft(createSessionDraftFromSession(updatedSession));
    setIsSaving(false);
    refresh();
    onSaved(updatedSession);
  };

  return (
    <SessionDraftForm
      draft={draft}
      projects={[project]}
      isSaving={isSaving}
      submitLabel="Save changes"
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
      onDraftChange={setDraft}
      onCancel={() => {
        setDraft(createSessionDraftFromSession(session));
        setErrorMessage(null);
        onCancel();
      }}
      showProjectSelect={false}
    />
  );
}
