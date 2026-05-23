"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  arraysCourse,
  getAdjacentArrayLessons,
  getArrayLesson,
} from "@/features/courses/arrays/lib/arrays-course";
import { ArrayVisualizer } from "@/features/courses/arrays/components/array-visualizer";
import { cn } from "@/lib/utils";

interface ArrayLessonShellProps {
  lessonSegment: string;
}

export function ArrayLessonShell({ lessonSegment }: ArrayLessonShellProps) {
  const lesson = getArrayLesson(lessonSegment);

  if (!lesson) {
    return null;
  }

  const { previousLesson, nextLesson } = getAdjacentArrayLessons(lessonSegment);
  const progressPercent = (lesson.order / arraysCourse.lessons.length) * 100;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="icon-lg"
          render={<Link href={arraysCourse.coursePath} />}
          className="rounded-full border border-border bg-background/70 text-foreground hover:bg-accent/60"
          aria-label="Back to course"
        >
          <ArrowLeft className="size-5" />
        </Button>

        <div className="min-w-0 flex-1 px-2">
          <div className="relative h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--chart-2)))] transition-[width] duration-500"
              style={{ width: `${progressPercent}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-between px-2">
              {arraysCourse.lessons.map((courseLesson) => (
                <span
                  key={courseLesson.segment}
                  className={cn(
                    "size-2 rounded-full border border-background/80 transition-colors",
                    courseLesson.order <= lesson.order
                      ? "bg-background/95"
                      : "bg-background/30"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ProgressArrow lesson={previousLesson} direction="left" />
          <ProgressArrow lesson={nextLesson} direction="right" />
        </div>
      </div>

      <div id="lesson-top" className="mx-auto w-full max-w-6xl min-h-0 flex-1">
        <ArrayVisualizer lesson={lesson} />
      </div>
    </div>
  );
}

function ProgressArrow({
  lesson,
  direction,
}: {
  lesson?: { title: string; segment: string };
  direction: "left" | "right";
}) {
  const icon =
    direction === "left" ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />;
  const href = lesson ? `/dashboard/courses/array/${lesson.segment}` : undefined;
  const label =
    lesson ? lesson.title : direction === "left" ? "No previous lesson" : "No next lesson";

  const button = href ? (
    <Button
      variant="ghost"
      size="icon-lg"
      render={<Link href={href} aria-label={`Go to ${label}`} title={label} />}
      className="rounded-full border border-border bg-background/70 text-foreground hover:bg-accent/60"
    >
      {icon}
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon-lg"
      disabled
      aria-label={label}
      title={label}
      className="rounded-full border border-border bg-background/50 text-muted-foreground"
    >
      {icon}
    </Button>
  );

  return <span title={label}>{button}</span>;
}
