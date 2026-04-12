import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import {
  CalendarClockIcon,
  FolderIcon,
  MessageSquareIcon,
  PenLineIcon,
  PresentationIcon,
  TargetIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/server"
import Image from "next/image"
import { TiltCard } from "@/components/unlumen-ui/tilt-card"

type PageProps = {
  params: Promise<{ project_id: string }>
  searchParams: Promise<{ session?: string }>
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

function formatDate(date: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date))
  } catch {
    return date
  }
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { project_id } = await params
  const { session: activeSessionId } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect("/login")
  }

  const { data: projectData, error: projectError } = await supabase
    .from("teaching_projects")
    .select("id, owner_id, name, description, created_at, updated_at")
    .eq("owner_id", user.id)
    .eq("id", project_id)
    .single()

  if (projectError || !projectData) {
    notFound()
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from("teaching_sessions")
    .select(
      "id, owner_id, project_id, title, topic, learning_goals, lesson_structure, content_outline, status, is_live, created_at, updated_at"
    )
    .eq("owner_id", user.id)
    .eq("project_id", project_id)
    .order("created_at", { ascending: false })

  if (sessionError) {
    notFound()
  }

  const project = projectData as TeachingProject
  const sessions = (sessionData ?? []) as TeachingSession[]

  const selectedSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">
      <div className="mb-4 flex flex-wrap items-start justify- gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderIcon className="size-4 text-muted-foreground" />
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              {project.name}
            </h1>
          </div>
          {project.description ? (
            <p className="max-w-3xl text-sm text-muted-foreground">{project.description}</p>
          ) : (
            <p className="max-w-3xl text-sm text-muted-foreground">
              This project groups all related teaching chats and sessions.
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">{sessions.length} chats</Badge>
            <Badge variant="outline">Updated {formatDate(project.updated_at)}</Badge>
          </div>
        </div>
        <div className="relative group">
          <div className="absolute top-1/2 left-1/2 z-0 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-15 transition-opacity duration-500 ease-in-out group-hover:opacity-30 " />
          <Image
            className="relative z-10"
            src="/thought-time.png"
            alt="Teacher Empowering"
            width={200}
            height={205}
          />
        </div>

      </div>
      <Button
        render={<Link href={`/session/new?project_id=${project.id}`} />}
      >
        <PenLineIcon className="size-4" />
        New session
      </Button>

      <section className="max-w-4xl py-10 px-5">
        {
          sessions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {sessions.map((session) => (
                <TiltCard
                  className="max-w-4xl h-32"
                  title={session.title}
                  description={session.lesson_structure}
                  price="Free"
                  badgeLabel="Popular"
                  // imageSrc="/preview.png"
                  href="/templates/starter"
                />
                // <Card>
                //   <CardHeader className="flex justify-between items-center">
                //     <CardTitle>{session.title}</CardTitle>
                //     <p>{formatDate(session.created_at)}</p>
                //   </CardHeader>
                //   <CardPanel>
                //     <CardDescription>{session.lesson_structure}</CardDescription>
                //   </CardPanel>

                // </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
              No sessions created yet. Click on New session to create your first teaching chat.
            </div>
          )
        }
      </section>
      {/* 
        <CardFooter>Footer</CardFooter> */}
      {/* <div className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]">
      

        <Card className="border-border" size="sm">
          <CardHeader className="border-b">
            <CardTitle>Project Chats</CardTitle>
            <CardDescription>
              Select a session to view complete teaching details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessions.length === 0 ? (
              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                No chats yet. Create your first session in this project.
              </div>
            ) : (
              sessions.map((session) => {
                const href = `/dashboard/project/${project.id}?session=${session.id}`
                const isActive = selectedSession?.id === session.id

                return (
                  <Link
                    key={session.id}
                    href={href}
                    className={cn(
                      "block rounded-md border border-border px-3 py-2 transition-colors",
                      isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/40"
                    )}
                  >
                    <p className="truncate text-sm font-medium">{session.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {session.topic}
                    </p>
                  </Link>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="border-b">
            <CardTitle>
              {selectedSession ? selectedSession.title : "Session details"}
            </CardTitle>
            <CardDescription>
              {selectedSession
                ? "Review context before entering Present Mode."
                : "Select a chat from the left to review details."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {selectedSession ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{selectedSession.topic}</Badge>
                  <Badge variant="outline">{selectedSession.status}</Badge>
                  <Badge variant="outline">
                    <CalendarClockIcon className="size-3" />
                    {formatDate(selectedSession.created_at)}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <TargetIcon className="size-4" />
                      Learning goals
                    </h3>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {selectedSession.learning_goals}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquareIcon className="size-4" />
                      Lesson structure
                    </h3>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {selectedSession.lesson_structure}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
                  <h3 className="text-sm font-medium">Content outline</h3>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {selectedSession.content_outline || "No extra outline provided for this session."}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    render={
                      <Link
                        href={`/dashboard/talk?projectId=${project.id}&sessionId=${selectedSession.id}`}
                      />
                    }
                    nativeButton={false}
                  >
                    <PresentationIcon className="size-4" />
                    Present Mode
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-md border border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                This project has no sessions yet. Use New session to create one.
              </div>
            )}
          </CardContent>
        </Card>
      </div> */}
    </section>
  )
}
