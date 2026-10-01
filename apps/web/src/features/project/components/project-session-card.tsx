"use client"

import Link from "next/link"

import { CalendarClockIcon, MoreHorizontalIcon, PenLineIcon, PresentationIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDate } from "@/features/project/lib/project-lib"
import { getSessionPreviewText } from "@/features/session/lib/session-lib"
import type { TeachingSession } from "@/features/session/types/session-types"
import { cn } from "@/lib/utils"

type ProjectSessionCardProps = {
  projectId: string
  session: TeachingSession
  isHighlighted?: boolean
  onEdit: (sessionId: string) => void
}

export function ProjectSessionCard({
  projectId,
  session,
  isHighlighted = false,
  onEdit,
}: ProjectSessionCardProps) {
  return (
    <Card
      className={cn(
        "border-border/70 bg-card/95 transition-shadow duration-200 hover:shadow-lg/5",
        isHighlighted && "border-primary/50 shadow-primary/10 shadow-lg ring-1 ring-primary/20"
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span>Session</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span>{session.topic}</span>
            </div>
            <div className="space-y-2">
              <CardTitle className="line-clamp-2 text-xl leading-snug">{session.title}</CardTitle>
              <CardDescription className="line-clamp-3 leading-6">
                {getSessionPreviewText(session)}
              </CardDescription>
            </div>
          </div>

          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" />}
              >
                <MoreHorizontalIcon className="size-4" />
                <span className="sr-only">Open session actions</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit(session.id)}>
                  <PenLineIcon className="size-4" />
                  Edit session
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href={`/dashboard/talk?projectId=${projectId}&sessionId=${session.id}`} />}
                >
                  <PresentationIcon className="size-4" />
                  Open presenter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{session.topic}</Badge>
          <Badge variant="outline">{session.status}</Badge>
          {session.is_live ? <Badge variant="success">Live</Badge> : null}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClockIcon className="size-3.5" />
          <span>Updated {formatDate(session.updated_at)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
