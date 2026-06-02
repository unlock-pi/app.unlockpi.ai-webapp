"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Layers3, Braces, Link2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CourseDefinition } from "@/features/courses/types/course";

const COURSE_META: Record<string, { icon: React.ReactNode; gradient: string; accent: string }> = {
  array: {
    icon: <Braces className="size-7" />,
    gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
    accent: "text-blue-400",
  },
  "linked-lists": {
    icon: <Link2 className="size-7" />,
    gradient: "from-red-500/15 via-red-600/8 to-transparent",
    accent: "text-primary",
  },
};

const FALLBACK_META = {
  icon: <Layers3 className="size-7" />,
  gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
  accent: "text-emerald-400",
};

interface CoursesCatalogProps {
  courses: CourseDefinition[];
}

export function CoursesCatalog({ courses }: CoursesCatalogProps) {
  return (
    <div className="flex flex-1 flex-col gap-8 px-4 py-6 lg:px-8">
      <div className="space-y-3">
        <Badge variant="secondary">Courses</Badge>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Interactive lessons</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Start with Arrays. The course system is built to scale — each course isolates one
            mental model so the structure stays easy to build in your head.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {courses.map((course, i) => (
          <CourseCard key={course.slug} course={course} index={i} />
        ))}
      </div>
    </div>
  );
}

function CourseCard({ course, index }: { course: CourseDefinition; index: number }) {
  const [hovered, setHovered] = useState(false);
  const meta = COURSE_META[course.slug] ?? FALLBACK_META;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[2rem] border border-border/70 bg-card/70",
        "transition-all duration-300 ease-out",
        hovered && "border-primary/30 shadow-[0_0_40px_rgba(59,130,246,0.12)] -translate-y-1"
      )}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* gradient glow header */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-40 bg-gradient-to-br opacity-0 transition-opacity duration-500",
          meta.gradient,
          hovered && "opacity-100"
        )}
      />

      <div className="relative flex flex-1 flex-col p-6 gap-5">
        {/* icon + badges row */}
        <div className="flex items-start justify-between gap-3">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-background/60 transition-colors duration-300",
              meta.accent,
              hovered && "border-primary/30 bg-primary/8"
            )}
          >
            {meta.icon}
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{course.difficulty}</Badge>
            <Badge variant="secondary">{course.heroMetric}</Badge>
          </div>
        </div>

        {/* title + description */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">{course.title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{course.description}</p>
        </div>

        {/* meta row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" />
            {course.estimatedMinutes} min
          </span>
          <span className="flex items-center gap-1.5">
            <Layers3 className="size-3.5" />
            {course.steps.length} steps
          </span>
        </div>

        {/* outcomes */}
        <ul className="flex-1 space-y-1.5 text-sm text-muted-foreground">
          {course.learningOutcomes.slice(0, 2).map((outcome) => (
            <li key={outcome} className="flex items-start gap-2">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
              {outcome}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          render={<Link href={`/dashboard/courses/${course.slug}`} />}
          className={cn(
            "w-full gap-2 transition-all duration-300",
            hovered && "shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          )}
        >
          Open lesson
          <ArrowRight
            className={cn(
              "size-4 transition-transform duration-200",
              hovered && "translate-x-0.5"
            )}
          />
        </Button>
      </div>
    </div>
  );
}
