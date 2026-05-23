import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { arraysCourse } from "@/features/courses/arrays/lib/arrays-course";

export function CoursesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="space-y-1">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Learning path</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Step-by-step paths to mastery
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/70">
          <div className="flex max-w-xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Image src="/array-image.png" alt="Array lesson preview" width={300} height={200} />
            <div className="max-w-3xl space-y-3">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">{arraysCourse.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Positions, indexing, updating, shifting, and traversal taught through a more
                  visual, interactive lesson flow.
                </p>
                <Button className="gap-2" render={<Link href={arraysCourse.coursePath} />}>
                  Open Arrays
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
