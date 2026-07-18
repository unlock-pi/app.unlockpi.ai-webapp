"use client"

import { useMemo, useState } from "react"

import { FolderIcon } from "lucide-react"
import { motion, type Variants } from "motion/react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectSessionCard } from "@/features/project/components/project-session-card"
import { ProjectSessionEditDialog } from "@/features/project/components/project-session-edit-dialog"
import type { TeachingProject } from "@/features/project/types/project-types"
import type { TeachingSession } from "@/features/session/types/session-types"
import { formatDate } from "@/features/project/lib/project-lib"

type ProjectWorkspaceProps = {
  project: TeachingProject
  sessions: TeachingSession[]
  initialSessionId?: string | null
}

const cardListVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
} satisfies Variants

const cardItemVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
} satisfies Variants

export function ProjectWorkspace({
  project,
  sessions: initialSessions,
  initialSessionId,
}: ProjectWorkspaceProps) {
  const [sessionOverrides, setSessionOverrides] = useState<Record<string, TeachingSession>>({})
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)

  const sessions = useMemo(
    () =>
      initialSessions.map((session) => {
        return sessionOverrides[session.id] ?? session
      }),
    [initialSessions, sessionOverrides]
  )

  const displayedSessions = useMemo(() => {
    if (!initialSessionId) {
      return sessions
    }

    const featuredSession = sessions.find((session) => session.id === initialSessionId)
    if (!featuredSession) {
      return sessions
    }

    return [
      featuredSession,
      ...sessions.filter((session) => session.id !== initialSessionId),
    ]
  }, [initialSessionId, sessions])

  const editingSession =
    sessions.find((session) => session.id === editingSessionId) ?? null

  return (
    <>
      <div className="space-y-6">
        <Card className="border-border/70">
          <CardHeader className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-border/70 bg-muted/30 p-2 text-muted-foreground">
                <FolderIcon className="size-4" />
              </div>
              <div className="space-y-2">
                <CardTitle>Project sessions</CardTitle>
                <CardDescription>
                  Every session created inside this project lives here. Open one to edit it or jump
                  into presentation mode when you are ready to teach.
                </CardDescription>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{sessions.length} total sessions</Badge>
              <Badge variant="secondary">Updated {formatDate(project.updated_at)}</Badge>
            </div>
          </CardHeader>
        </Card>

        {displayedSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Card className="border-border/70 border-dashed">
              <CardContent className="p-6">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                  This project has no sessions yet. Create one to start building your teaching flow.
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={cardListVariants}
          >
            {displayedSessions.map((session) => (
              <motion.div key={session.id} variants={cardItemVariants}>
                <ProjectSessionCard
                  projectId={project.id}
                  session={session}
                  isHighlighted={session.id === initialSessionId}
                  onEdit={setEditingSessionId}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <ProjectSessionEditDialog
        key={editingSession?.id ?? "project-session-editor"}
        open={editingSession !== null}
        project={project}
        session={editingSession}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSessionId(null)
          }
        }}
        onSaved={(updatedSession) => {
          setSessionOverrides((previous) => ({
            ...previous,
            [updatedSession.id]: updatedSession,
          }))
          setEditingSessionId(null)
        }}
      />
    </>
  )
}
