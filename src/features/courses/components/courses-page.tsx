import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { arraysCourse } from "@/features/courses/arrays/lib/arrays-course";

export function CoursesPage() {
  return (
    <div className="flex flex-1 flex-col w-full mx-auto max-w-5xl gap-6 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full flex-col gap-6 pt-6">
        <section className="space-y-1">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Learning path</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Step-by-step paths to mastery
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/70">
          <Link href={arraysCourse.coursePath}  className="flex max-w-[300px] items-center  flex-col gap-4  hover:cursor-progress lg:justify-between">
            <Image className="bg-foreground dark:bg-card rounded-sm" src="/array-image2.png" alt="Array lesson preview" width={300} height={200} />
            <div className="max-w-3xl space-y-3 mx-auto">
              <div>
                <h2 className="text-xl font-medium tracking-tight">{arraysCourse.title}</h2>
                {/* <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Positions, indexing, updating, shifting, and traversal taught through a more
                  visual, interactive lesson flow.
                </p> */}
                {/* <Button className="gap-2" render={<Link href={arraysCourse.coursePath} />}>
                  Open Arrays
                  <ArrowRight className="size-4" />
                </Button> */}
              </div>
            </div>
          </Link>
        </section>
      </div>
    </div>
  );
}
