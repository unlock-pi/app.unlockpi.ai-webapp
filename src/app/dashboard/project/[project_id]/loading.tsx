import { FolderIcon, PenLineIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ProjectDetailLoading() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FolderIcon className="size-4 text-muted-foreground" />
            <Skeleton className="h-7 w-56" />
          </div>
          <Skeleton className="h-4 w-120 max-w-full" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">
              <Skeleton className="h-3 w-14" />
            </Badge>
            <Badge variant="outline">
              <Skeleton className="h-3 w-28" />
            </Badge>
          </div>
        </div>

        <Skeleton className="h-51.25 w-50 rounded-t-2xl" />
      </div>

      <Button disabled>
        <PenLineIcon className="size-4" />
        New session
      </Button>

      <section className="max-w-4xl px-5 py-10">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`project-session-skeleton-${index}`} className="h-32 border-border">
              <CardHeader className="justify-center gap-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </section>
  )
}
