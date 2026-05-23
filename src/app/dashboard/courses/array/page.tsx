import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { arraysCourse } from "@/features/courses/arrays/lib/arrays-course";

export default function ArrayCourseLanding() {
  const firstLesson = arraysCourse.lessons[0];

  return (
    <div className="flex flex-1 flex-col gap-8 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-lg border border-border/70 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">{arraysCourse.title}</h1>
                <p className="mt-0 text-sm text-muted-foreground">
                  {arraysCourse.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <Button
                className="gap-2"
                render={<Link href={`${arraysCourse.coursePath}/${firstLesson.segment}`} />}
              >
                Start Arrays
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Lesson map
            </h2>
          </div>

          <div className="rounded-lg border border-border/70 bg-card/70 p-5">
            <div className="space-y-3">
              {arraysCourse.lessons.map((lesson, index) => (
                <div key={lesson.segment} className="flex gap-4">
                  <div className="flex w-10 flex-col items-center">
                    <div className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/8 text-sm font-medium text-primary">
                      {lesson.order}
                    </div>
                    {index < arraysCourse.lessons.length - 1 ? (
                      <div className="mt-2 h-full w-px bg-border" />
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 rounded-[1.5rem] border border-border/60 bg-background/35 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-2xl">
                      <h3 className="text-base font-medium tracking-tight">{lesson.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {lesson.overview}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      className="gap-2 self-start md:self-auto"
                      render={<Link href={`${arraysCourse.coursePath}/${lesson.segment}`} />}
                    >
                      Open lesson
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
