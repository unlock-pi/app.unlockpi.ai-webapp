"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, Clock3 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { linkedListCourse } from "../lib/linked-list-course";

export function LinkedListCourseLanding() {
  const firstLesson = linkedListCourse.lessons[0];

  return (
    <div className="flex flex-1 flex-col gap-8 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2.25rem] border border-border/70 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.2)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(220,38,38,0.18),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-2 animate-pulse rounded-full bg-primary" />
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  Course · Linked Lists
                </p>
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">{linkedListCourse.title}</h1>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {linkedListCourse.description}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />
                  {linkedListCourse.lessons.length} lessons
                </span>
                <span className="size-1 rounded-full bg-border" />
                <span>Pointer-based thinking</span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <Button
                className="gap-2 shadow-[0_0_24px_rgba(220,38,38,0.25)] transition-shadow hover:shadow-[0_0_32px_rgba(220,38,38,0.4)]"
                render={<Link href={`${linkedListCourse.coursePath}/${firstLesson.segment}`} />}
              >
                Start Linked Lists
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Lesson map */}
        <section className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Lesson map</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Follow the chain one idea at a time
            </h2>
          </div>

          <div className="rounded-[1.75rem] border border-border/70 bg-card/70 p-5">
            <div className="space-y-2">
              {linkedListCourse.lessons.map((lesson, index) => (
                <LessonRow
                  key={lesson.segment}
                  lesson={lesson}
                  index={index}
                  total={linkedListCourse.lessons.length}
                  href={`${linkedListCourse.coursePath}/${lesson.segment}`}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  index,
  total,
  href,
}: {
  lesson: { segment: string; order: number; title: string; overview: string };
  index: number;
  total: number;
  href: string;
}) {
  const [hovered, setHovered] = useState(false);
  const isLast = index === total - 1;

  return (
    <div className="flex gap-4">
      <div className="flex w-10 flex-col items-center">
        <div
          className={cn(
            "relative flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300",
            hovered
              ? "border-primary bg-primary/20 text-primary-foreground shadow-[0_0_16px_rgba(220,38,38,0.5)]"
              : "border-primary/30 bg-primary/8 text-primary"
          )}
        >
          {lesson.order}
          {hovered && (
            <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              "mt-2 w-px flex-1 transition-colors duration-300",
              hovered ? "bg-primary/40" : "bg-border"
            )}
          />
        )}
      </div>

      <Link
        href={href}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "mb-2 flex flex-1 flex-col gap-3 rounded-[1.5rem] border px-5 py-4 transition-all duration-200",
          "md:flex-row md:items-center md:justify-between",
          hovered
            ? "border-primary/30 bg-primary/5 shadow-[0_4px_24px_rgba(220,38,38,0.08)]"
            : "border-border/60 bg-background/35"
        )}
      >
        <div className="max-w-2xl">
          <h3
            className={cn(
              "text-base font-medium tracking-tight transition-colors duration-200",
              hovered && "text-primary"
            )}
          >
            {lesson.title}
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{lesson.overview}</p>
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 self-start text-sm font-medium text-muted-foreground transition-all duration-200 md:self-auto",
            hovered && "translate-x-0.5 text-primary"
          )}
        >
          Open lesson
          <ChevronRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}
