import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { arraysCourse } from "@/features/courses/arrays/lib/arrays-course";

export default function CoursesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Courses</p>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Pick a focused course</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              These are built as teaching surfaces, not document dumps. You enter a course,
              move lesson by lesson, and later the voice layer can sit on top without changing
              the structure.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.16)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                Available now
              </p>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">{arraysCourse.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Positions, indexing, updating, shifting, and traversal taught through a more
                  visual, interactive lesson flow.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <Button className="gap-2" render={<Link href={arraysCourse.coursePath} />}>
                Open Arrays
                <ArrowRight className="size-4" />
              </Button>
              <div className="flex flex-col items-start gap-2 lg:items-end">
                <Button variant="outline" disabled className="gap-2">
                  <Mic className="size-4" />
                  Talk through course
                </Button>
                <p className="max-w-56 text-xs leading-5 text-muted-foreground lg:text-right">
                  Voice-ready seams are wired in, but kept quiet in the UI for now.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
