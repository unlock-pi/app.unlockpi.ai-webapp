import { Skeleton } from "@/components/ui/skeleton";

/**
 * Rendered while a canvas is loading. Mirrors the editor chrome — top
 * header bar, left rail, center slide surface, right inspector — so
 * opening a canvas from the library never flashes an empty page.
 */
export default function CanvasEditorLoading() {
  return (
    <section
      aria-label="Loading canvas"
      className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground"
    >
      <header className="flex h-14 items-center justify-between gap-4 border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[3rem_18rem_1fr_20rem] overflow-hidden">
        <div className="flex flex-col items-center gap-3 border-r border-border py-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={`rail-icon-skeleton-${index}`}
              className="size-8 rounded-md"
            />
          ))}
        </div>

        <div className="flex flex-col gap-3 border-r border-border p-3">
          <Skeleton className="h-6 w-24" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`frame-thumb-skeleton-${index}`}
              className="flex flex-col gap-2 rounded-lg border border-border p-2"
            >
              <Skeleton className="aspect-video w-full rounded-md" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
          <div className="grid aspect-video w-full max-w-4xl gap-6 rounded-2xl border border-border bg-card p-10">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={`slide-cell-skeleton-${index}`}
                  className="size-12 rounded-xl"
                />
              ))}
            </div>
            <Skeleton className="mt-6 h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-l border-border p-4">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`inspector-field-skeleton-${index}`}
              className="space-y-2"
            >
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
