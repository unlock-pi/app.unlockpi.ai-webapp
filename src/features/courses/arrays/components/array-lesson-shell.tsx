"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrayVisualizer } from "@/features/courses/arrays/components/array-visualizer";
import {
  arraysCourse,
  getAdjacentArrayLessons,
  getArrayLesson,
} from "@/features/courses/arrays/lib/arrays-course";
import { cn } from "@/lib/utils";

interface ArrayLessonShellProps {
  lessonSegment: string;
}

export function ArrayLessonShell({ lessonSegment }: ArrayLessonShellProps) {
  const lesson = getArrayLesson(lessonSegment);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  if (!lesson) return null;

  const { previousLesson, nextLesson } = getAdjacentArrayLessons(lessonSegment);
  const progressPercent = (lesson.order / arraysCourse.lessons.length) * 100;
  const isCheckpointCorrect =
    lesson.checkpoint && selectedOptionId === lesson.checkpoint.correctOptionId;

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">

          {/* Progress rail */}
          <div className="rounded-[1.75rem] border border-border/70 bg-background/55 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.14)]">
            <div className="flex items-center gap-4">
              <ProgressArrow lesson={previousLesson} direction="left" />
              <div className="flex-1 space-y-3">
                <div className="relative h-4 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,rgba(59,130,246,0.8),rgba(56,189,248,0.9))] transition-[width] duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute inset-0 animate-pulse rounded-full opacity-40 bg-white/20" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-between px-2">
                    {arraysCourse.lessons.map((courseLesson) => (
                      <span
                        key={courseLesson.segment}
                        className={cn(
                          "size-2.5 rounded-full border border-background/70 transition-all duration-500",
                          courseLesson.order <= lesson.order
                            ? "bg-background/95 shadow-[0_0_4px_rgba(255,255,255,0.5)]"
                            : "bg-background/35"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <ProgressArrow lesson={nextLesson} direction="right" />
            </div>
          </div>

          {/* Lesson header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Link
                href={arraysCourse.coursePath}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to Arrays
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  Arrays · Lesson {lesson.order} of {arraysCourse.lessons.length}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">{lesson.title}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {lesson.overview}
                </p>
              </div>
            </div>
          </div>

          {/* Learning focus card */}
          <Card className="border-border/70 bg-card/70">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-4" />
                <CardTitle className="text-base">What are we learning in this lesson?</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-6 text-muted-foreground">{lesson.lessonGoal}</p>
              <ul className="grid gap-2 text-sm leading-6 text-muted-foreground md:grid-cols-3">
                {lesson.learningFocus.map((point) => (
                  <li
                    key={point}
                    className="flex gap-3 rounded-2xl border border-border/60 bg-background/40 px-4 py-3 transition-colors hover:border-primary/20 hover:bg-primary/5"
                  >
                    <span className="mt-2 size-2 rounded-full bg-primary/80 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Visualizer */}
          <ArrayVisualizer lesson={lesson} />

          {/* Checkpoint */}
          {lesson.checkpoint ? (
            <div className="rounded-[1.75rem] border border-border/70 bg-card/70 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
              {!showCheckpoint ? (
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                      Check yourself
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Ready for a quick question? Reveal one checkpoint for this lesson.
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowCheckpoint(true)}
                    className="gap-2 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_28px_rgba(59,130,246,0.35)]"
                  >
                    <Sparkles className="size-4" />
                    Open checkpoint
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                        Check yourself
                      </p>
                      <h2 className="mt-2 text-xl font-semibold tracking-tight">
                        {lesson.checkpoint.prompt}
                      </h2>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCheckpoint(false);
                        setSelectedOptionId(null);
                      }}
                    >
                      Hide
                    </Button>
                  </div>

                  <div className="grid gap-2.5">
                    {lesson.checkpoint.options.map((option) => {
                      const isSelected = selectedOptionId === option.id;
                      const answered = Boolean(selectedOptionId);
                      const isCorrect = option.id === lesson.checkpoint?.correctOptionId;

                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={answered}
                          onClick={() => setSelectedOptionId(option.id)}
                          className={cn(
                            "rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200",
                            "hover:border-primary/40 hover:bg-primary/5",
                            isSelected && !answered && "border-primary bg-primary/10",
                            answered && isCorrect &&
                              "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
                            answered && isSelected && !isCorrect &&
                              "border-rose-500/40 bg-rose-500/8 text-rose-300"
                          )}
                        >
                          <span className="flex items-center gap-3">
                            {answered && isCorrect && (
                              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                            )}
                            {option.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedOptionId && (
                    <div
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm leading-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
                        isCheckpointCorrect
                          ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-100"
                          : "border-amber-500/30 bg-amber-500/8 text-amber-100"
                      )}
                    >
                      {isCheckpointCorrect ? "✓ Correct! " : "Not quite — "}
                      {lesson.checkpoint.explanation}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
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
      variant="outline"
      size="icon-lg"
      render={<Link href={href} aria-label={`Go to ${label}`} />}
    >
      {icon}
    </Button>
  ) : (
    <Button variant="outline" size="icon-lg" disabled aria-label={label}>
      {icon}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
