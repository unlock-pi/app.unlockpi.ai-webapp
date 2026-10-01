import { FolderIcon } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Rendered while /dashboard/projects streams its data — the layout stays,
 * the shell chrome stays, only the page body swaps to this. Mirrors the
 * real page's max-w-5xl section + grid so the skeleton doesn't shift under
 * the user when the real content lands.
 */
export default function ProjectsLoading() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-4 rounded-lg py-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={`project-card-skeleton-${index}`} className="h-40 border-border">
            <CardHeader className="gap-3">
              <div className="flex items-center gap-2">
                <FolderIcon className="size-4 text-muted-foreground/40" />
                <Skeleton className="h-5 w-40" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="mt-2 h-3 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
