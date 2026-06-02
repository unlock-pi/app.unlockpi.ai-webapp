"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Sparkles, CheckCircle2, PartyPopper } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  linkedListCourse,
  getLinkedListLesson,
  getAdjacentLinkedListLessons,
} from "../lib/linked-list-course";
import { LinkedListVisualizer } from "./linked-list-visualizer";
import { LLCheckpointWidget } from "./linked-list-checkpoints";
import { useLessonVoiceControl } from "../hooks/use-lesson-voice-control";

interface LinkedListLessonProps {
  lessonSegment: string;
}

export function LinkedListLesson({ lessonSegment }: LinkedListLessonProps) {
  const router = useRouter();
  const lesson = getLinkedListLesson(lessonSegment);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<string>>(new Set());
  const [fadeKey, setFadeKey] = useState(0);
  const prevStepIndex = useRef(stepIndex);
  const lessonControl = useLessonVoiceControl();

  if (!lesson) return null;

  const { previousLesson, nextLesson } = getAdjacentLinkedListLessons(lessonSegment);
  const progressPercent = (lesson.order / linkedListCourse.lessons.length) * 100;

  const currentStep = lesson.steps[stepIndex];
  const hasCheckpoint = Boolean(currentStep?.checkpoint);
  const checkpointComplete = currentStep?.checkpoint
    ? completedCheckpoints.has(currentStep.id)
    : true;

  const canAdvance = checkpointComplete;
  const isLastStep = stepIndex === lesson.steps.length - 1;

  function handleNext() {
    if (!canAdvance) return;
    if (!isLastStep) {
      setFadeKey((k) => k + 1);
      setStepIndex((i) => i + 1);
    }
  }

  function handleBack() {
    if (stepIndex > 0) {
      setFadeKey((k) => k + 1);
      setStepIndex((i) => i - 1);
    }
  }

  function handleCheckpointComplete() {
    if (!currentStep.checkpoint) return;
    setCompletedCheckpoints((prev) => new Set([...prev, currentStep.id]));
  }

  useEffect(() => {
    if (!lessonControl || !lesson) return;

    const { action, target } = lessonControl;

    const goToNextStep = () => {
      setFadeKey((k) => k + 1);
      setStepIndex((i) => Math.min(i + 1, lesson.steps.length - 1));
    };

    const goToPrevStep = () => {
      setFadeKey((k) => k + 1);
      setStepIndex((i) => Math.max(i - 1, 0));
    };

    const navigateToChapter = (t: string) => {
      const num = parseInt(t.split("_").pop() ?? "1", 10);
      const ordered = [...linkedListCourse.lessons].sort((a, b) => a.order - b.order);
      const target = ordered[num - 1];
      if (target) router.push(`${linkedListCourse.coursePath}/${target.segment}`);
    };

    const resetLesson = () => {
      setFadeKey((k) => k + 1);
      setStepIndex(0);
    };

    switch (action) {
      case "next_step": goToNextStep(); break;
      case "prev_step": goToPrevStep(); break;
      case "goto_chapter": navigateToChapter(target); break;
      case "reset": resetLesson(); break;
      // select / highlight_node / answer / drag_order: handled by visualizer/checkpoints via lessonControl prop
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonControl?.timestamp]);

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">

          {/* Progress rail */}
          <div className="rounded-[1.75rem] border border-border/70 bg-background/55 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.14)]">
            <div className="flex items-center gap-4">
              <LessonProgressArrow lesson={previousLesson} direction="left" />
              <div className="flex-1">
                <div className="relative h-4 overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,rgba(220,38,38,0.8),rgba(248,113,113,0.9))] transition-[width] duration-700 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute inset-0 animate-pulse rounded-full opacity-40 bg-white/20" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-between px-2">
                    {linkedListCourse.lessons.map((l) => (
                      <span
                        key={l.segment}
                        className={cn(
                          "size-2.5 rounded-full border border-background/70 transition-all duration-500",
                          l.order <= lesson.order
                            ? "bg-background/95 shadow-[0_0_4px_rgba(255,255,255,0.5)]"
                            : "bg-background/35"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <LessonProgressArrow lesson={nextLesson} direction="right" />
            </div>
          </div>

          {/* Lesson header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <Link
                href={linkedListCourse.coursePath}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to Linked Lists
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  Linked Lists · Lesson {lesson.order} of {linkedListCourse.lessons.length}
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

          {/* Step card */}
          <div className="rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">

            {/* Step header */}
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{currentStep.eyebrow}</Badge>
                {/* animated step dots */}
                <div className="flex gap-1.5">
                  {lesson.steps.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { if (i <= stepIndex) { setFadeKey((k) => k + 1); setStepIndex(i); } }}
                      aria-label={`Go to step ${i + 1}`}
                      className={cn(
                        "rounded-full transition-all duration-300",
                        i === stepIndex
                          ? "size-3 bg-primary shadow-[0_0_8px_rgba(220,38,38,0.8)]"
                          : i < stepIndex
                            ? "size-2 bg-primary/40"
                            : "size-2 bg-muted"
                      )}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {stepIndex + 1} / {lesson.steps.length}
              </span>
            </div>

            {/* Visual — fades on step change */}
            <div
              key={fadeKey}
              className="rounded-[1.5rem] border border-border/50 bg-background/40 p-4 animate-in fade-in duration-400"
            >
              <LinkedListVisualizer visual={currentStep.visual} />
            </div>

            {/* Step title + body */}
            <div
              key={`text-${fadeKey}`}
              className="mt-5 space-y-2 animate-in fade-in slide-in-from-bottom-1 duration-400"
            >
              <h2 className="text-xl font-semibold tracking-tight">{currentStep.title}</h2>
              <p className="text-sm leading-7 text-muted-foreground">{currentStep.body}</p>
            </div>

            {/* Checkpoint */}
            {hasCheckpoint && currentStep.checkpoint && (
              <div className="mt-6 rounded-[1.5rem] border border-border/60 bg-background/55 p-5">
                <p className="mb-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">
                  Check yourself
                </p>
                {!checkpointComplete ? (
                  <LLCheckpointWidget
                    checkpoint={currentStep.checkpoint}
                    onComplete={handleCheckpointComplete}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100 animate-in fade-in duration-300">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                    <span>Checkpoint complete — continue when ready.</span>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={stepIndex === 0}
                className="gap-2"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>

              {isLastStep ? (
                nextLesson ? (
                  <Button
                    disabled={!canAdvance}
                    render={canAdvance ? <Link href={`${linkedListCourse.coursePath}/${nextLesson.segment}`} /> : undefined}
                    className={cn(
                      "gap-2 transition-all",
                      canAdvance && "shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_28px_rgba(220,38,38,0.5)]"
                    )}
                  >
                    Next lesson
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    disabled={!canAdvance}
                    variant="outline"
                    className={cn("gap-2", canAdvance && "border-emerald-500/40 text-emerald-300")}
                  >
                    <PartyPopper className="size-4" />
                    Course complete!
                  </Button>
                )
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canAdvance}
                  className={cn(
                    "gap-2 transition-all",
                    canAdvance && "shadow-[0_0_16px_rgba(220,38,38,0.25)] hover:shadow-[0_0_24px_rgba(220,38,38,0.4)]"
                  )}
                >
                  Continue
                  <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>
    </TooltipProvider>
  );
}

function LessonProgressArrow({
  lesson,
  direction,
}: {
  lesson?: { title: string; segment: string };
  direction: "left" | "right";
}) {
  const icon =
    direction === "left" ? <ArrowLeft className="size-4" /> : <ArrowRight className="size-4" />;
  const href = lesson ? `${linkedListCourse.coursePath}/${lesson.segment}` : undefined;
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
