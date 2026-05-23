"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { LinePath } from "@visx/shape";
import { useState } from "react";

import { ArrayStrip } from "@/features/courses/arrays/components/array-strip";
import type {
  ArrayLessonCheckpoint,
  ArrayLessonDefinition,
} from "@/features/courses/arrays/lib/arrays-course";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ArrayValue = string | number;

type VisualArrayFrame = {
  kind: "visual";
  caption: React.ReactNode;
  visual: "tree" | "integer-array" | "char-array" | "string-array";
  data?: ArrayValue[];
  dimElements?: boolean;
  dimIndices?: boolean;
  highlightElements?: boolean;
  highlightIndices?: boolean;
  activeIndex?: number;
  disabledElements?: number[];
  arrayName?: string;
  nameHint?: string;
  accessExpression?: string;
  showIndex?: boolean;
};

type CheckpointArrayFrame = {
  kind: "checkpoint";
  caption: React.ReactNode;
  checkpoint?: ArrayLessonCheckpoint;
};

type ArrayFrame = VisualArrayFrame | CheckpointArrayFrame;

const integerValues = [8, 5, 0, 1, 4, 9, 3];
const characterValues = ["a", "b", "c", "d", "e", "f", "g"];
const stringValues = ["org", "net", "edu", "com", "dev", "io", "info"];

const introFrames: ArrayFrame[] = [
  {
    kind: "visual",
    visual: "tree",
    caption:
      "Data structures can be linear or non-linear. Arrays belong to the linear family.",
  },
  {
    kind: "visual",
    visual: "integer-array",
    caption: "An array is a row of values you reach by index.",
    arrayName: "A",
    nameHint: "(values)",
  },
  {
    kind: "visual",
    visual: "integer-array",
    caption: "The items in the row are called elements.",
    arrayName: "A",
    nameHint: "(elements)",
    highlightElements: true,
  },
  {
    kind: "visual",
    visual: "integer-array",
    caption: "Most languages start indexing at 0.",
    arrayName: "A",
    nameHint: "(indices)",
    highlightIndices: true,
    dimElements: true,
  },
  {
    kind: "visual",
    visual: "integer-array",
    caption: "So `A[0]` means the first slot in the row.",
    arrayName: "A",
    accessExpression: "A[0]",
    activeIndex: 0,
    disabledElements: [1, 2, 3, 4, 5, 6],
  },
  {
    kind: "visual",
    visual: "char-array",
    caption: "Arrays can also hold characters.",
  },
  {
    kind: "visual",
    visual: "string-array",
    caption: "Or strings, names, and other text values.",
  },
  {
    kind: "visual",
    visual: "string-array",
    caption: "A shared name like `A` refers to the whole array.",
    arrayName: "A",
    nameHint: "(name)",
  },
];

interface ArrayVisualizerProps {
  lesson: ArrayLessonDefinition;
}

export function ArrayVisualizer({ lesson }: ArrayVisualizerProps) {
  const frames =
    lesson.segment === "what-is-an-array"
      ? [...introFrames, buildCheckpointFrame(lesson.checkpoint)]
      : buildFramesFromLesson(lesson);
  const [frameIndex, setFrameIndex] = useState(0);
  const frame = frames[frameIndex];
  const canGoBack = frameIndex > 0;
  const canGoNext = frameIndex < frames.length - 1;

  return (
    <section className="relative flex min-h-[calc(100svh-14rem)] flex-col overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 md:px-6">
        <Button
          variant="ghost"
          size="icon-lg"
          render={<Link href={arraysCoursePath} aria-label="Back to courses" />}
          className="rounded-full border border-border bg-background/70 hover:bg-accent/60"
        >
          <ArrowLeft className="size-5" />
        </Button>

        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Arrays lesson
          </p>
          <p className="mt-1 text-sm font-semibold tracking-tight">{lesson.shortTitle}</p>
        </div>

        <div className="w-10" />
      </div>

      <div className="flex flex-1 flex-col gap-5 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.07),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] px-4 py-4 md:px-6 md:py-6">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          {frame.kind === "visual" ? (
            <VisualSlide frame={frame} />
          ) : (
            <CheckpointSlide checkpoint={frame.checkpoint} />
          )}
        </div>

        <div className="grid grid-cols-[76px_1fr_76px] items-center gap-3 md:grid-cols-[88px_1fr_88px] md:gap-4">
          <RoundStepButton
            direction="back"
            disabled={!canGoBack}
            onClick={() => setFrameIndex((current) => Math.max(0, current - 1))}
          />

          <p className="mx-auto max-w-3xl text-center text-sm leading-6 text-muted-foreground md:text-base">
            {frame.caption}
          </p>

          <div className="grid justify-items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              {frameIndex + 1} / {frames.length}
            </span>
            <RoundStepButton
              direction="next"
              disabled={!canGoNext}
              onClick={() =>
                setFrameIndex((current) => Math.min(frames.length - 1, current + 1))
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function VisualSlide({ frame }: { frame: VisualArrayFrame }) {
  const values = frame.data ?? valuesForFrame(frame.visual);

  return (
    <div className="flex w-full items-center justify-center overflow-hidden">
      {frame.visual === "tree" ? (
        <DataStructureTree dimElements={frame.dimElements} />
      ) : (
        <ArrayStrip
          data={values}
          name={frame.arrayName}
          nameHint={frame.nameHint}
          accessExpression={frame.accessExpression}
          showIndex={frame.showIndex ?? true}
          disabledElements={frame.disabledElements ?? []}
          activeIndex={frame.activeIndex}
          dimElements={frame.dimElements}
          dimIndices={frame.dimIndices}
          highlightElements={frame.highlightElements}
          highlightIndices={frame.highlightIndices}
        />
      )}
    </div>
  );
}

function CheckpointSlide({ checkpoint }: { checkpoint?: ArrayLessonCheckpoint }) {
  if (!checkpoint) {
    return (
      <div className="rounded-[1.5rem] border border-border bg-background/60 px-6 py-8 text-center text-sm text-muted-foreground shadow-sm">
        No checkpoint for this lesson yet.
      </div>
    );
  }

  return <CheckpointCard checkpoint={checkpoint} />;
}

function CheckpointCard({ checkpoint }: { checkpoint: ArrayLessonCheckpoint }) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const isCorrect = selectedOptionId === checkpoint.correctOptionId;

  return (
    <div className="w-full max-w-3xl rounded-[1.5rem] border border-border bg-background/85 p-6 shadow-[0_18px_48px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Quick check
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {checkpoint.prompt}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          className="rounded-full border border-border bg-card/70"
          aria-label="Question hint"
          title="This stays inside the lesson flow"
        >
          <ArrowRight className="size-4 opacity-0" />
        </Button>
      </div>

      <div className="mt-6 grid gap-3">
        {checkpoint.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const shouldReveal = Boolean(selectedOptionId);
          const optionIsCorrect = option.id === checkpoint.correctOptionId;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedOptionId(option.id)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                "border-border bg-card/80 hover:border-primary/40 hover:bg-primary/5",
                isSelected && "border-primary bg-primary/10",
                shouldReveal && optionIsCorrect && "border-emerald-500/40 bg-emerald-500/10",
                shouldReveal &&
                  isSelected &&
                  !optionIsCorrect &&
                  "border-rose-500/40 bg-rose-500/10"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {selectedOptionId ? (
        <div
          className={cn(
            "mt-4 rounded-2xl border px-4 py-3 text-sm leading-6",
            isCorrect
              ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-100"
              : "border-amber-500/30 bg-amber-500/8 text-amber-100"
          )}
        >
          {checkpoint.explanation}
        </div>
      ) : null}
    </div>
  );
}

function valuesForFrame(visual: VisualArrayFrame["visual"]): ArrayValue[] {
  if (visual === "char-array") {
    return characterValues;
  }

  if (visual === "string-array") {
    return stringValues;
  }

  return integerValues;
}

function buildFramesFromLesson(lesson: ArrayLessonDefinition): ArrayFrame[] {
  switch (lesson.segment) {
    case "indexing":
      return [
        {
          kind: "visual",
          visual: "string-array",
          caption: "Know the index, jump straight to the slot.",
          arrayName: "A",
          nameHint: "(access by index)",
          accessExpression: "A[2]",
          activeIndex: lesson.activeIndex,
          disabledElements: [0, 1, 3, 4, 5, 6],
        },
        {
          kind: "visual",
          visual: "string-array",
          caption: "Index 2 means the third position in the row.",
          arrayName: "A",
          highlightIndices: true,
          dimElements: true,
        },
        buildCheckpointFrame(lesson.checkpoint),
      ];
    case "updating":
      return [
        {
          kind: "visual",
          visual: "string-array",
          caption: "Updating changes the value, not the slot.",
          data: ["A", "B", "C", "D"],
          arrayName: "A",
          activeIndex: 2,
        },
        {
          kind: "visual",
          visual: "string-array",
          caption: "After the update, the row still has the same shape.",
          data: ["A", "B", "Z", "D"],
          arrayName: "A",
          activeIndex: 2,
          highlightElements: true,
        },
      ];
    case "insert-delete":
      return [
        {
          kind: "visual",
          visual: "integer-array",
          caption: "Insert here and the slots after it need room.",
          data: [8, 13, 21, 34],
          arrayName: "A",
          activeIndex: 1,
        },
        {
          kind: "visual",
          visual: "integer-array",
          caption: "That shift is why middle inserts cost more work.",
          data: [8, 13, 21, 34],
          arrayName: "A",
          activeIndex: 1,
          highlightElements: true,
          dimIndices: true,
        },
        buildCheckpointFrame(lesson.checkpoint),
      ];
    case "traversal":
      return [
        {
          kind: "visual",
          visual: "integer-array",
          caption: "Traversal moves one slot at a time.",
          data: [2, 4, 6, 8, 10],
          arrayName: "A",
          activeIndex: 0,
        },
        {
          kind: "visual",
          visual: "integer-array",
          caption: "You can sweep left to right and inspect every value.",
          data: [2, 4, 6, 8, 10],
          arrayName: "A",
          activeIndex: 2,
          highlightElements: true,
        },
        {
          kind: "visual",
          visual: "integer-array",
          caption: "By the end, every slot has been visited.",
          data: [2, 4, 6, 8, 10],
          arrayName: "A",
          activeIndex: 4,
        },
      ];
    default:
      return [
        {
          kind: "visual",
          visual: "string-array",
          caption: lesson.overview,
          data: lesson.cells.map((cell) => cell.value),
          arrayName: "A",
          activeIndex: lesson.activeIndex,
          disabledElements: lesson.cells.reduce<number[]>((acc, _cell, index) => {
            if (index !== lesson.activeIndex) {
              acc.push(index);
            }

            return acc;
          }, []),
        },
        ...(lesson.checkpoint ? [buildCheckpointFrame(lesson.checkpoint)] : []),
      ];
  }
}

function buildCheckpointFrame(checkpoint?: ArrayLessonCheckpoint): CheckpointArrayFrame {
  return {
    kind: "checkpoint",
    caption: "Use the buttons to stay inside the lesson, then check your understanding.",
    checkpoint,
  };
}

function DataStructureTree({ dimElements }: { dimElements?: boolean }) {
  const lines = [
    [
      [500, 70],
      [500, 116],
      [285, 116],
      [285, 170],
    ],
    [
      [500, 116],
      [715, 116],
      [715, 170],
    ],
    [
      [285, 218],
      [285, 260],
      [125, 260],
      [125, 304],
    ],
    [
      [285, 260],
      [245, 260],
      [245, 304],
    ],
    [
      [285, 260],
      [365, 260],
      [365, 304],
    ],
    [
      [285, 260],
      [475, 260],
      [475, 304],
    ],
    [
      [715, 218],
      [715, 260],
      [595, 260],
      [595, 304],
    ],
    [
      [715, 260],
      [715, 304],
    ],
    [
      [715, 260],
      [835, 260],
      [835, 304],
    ],
  ] satisfies Array<Array<[number, number]>>;

  return (
    <div className="relative h-[340px] w-full max-w-[980px]">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 360">
        {lines.map((line) => (
          <LinePath
            key={line.map(([x, y]) => `${x}-${y}`).join("_")}
            data={line}
            x={(point) => point[0]}
            y={(point) => point[1]}
            stroke="hsl(var(--border))"
            strokeWidth={2}
            fill="none"
          />
        ))}
      </svg>

      <TreeNode label="Data structure" className="left-[372px] top-4 bg-primary/10" />
      <TreeNode label="Linear" className="left-[184px] top-[132px] bg-primary/15" />
      <TreeNode
        label="Non-linear"
        className={cn("left-[616px] top-[132px] bg-secondary", dimElements && "opacity-25")}
      />
      <TreeNode label="Array" className="left-[54px] top-[260px] bg-background" />
      <TreeNode
        label="Linked list"
        className={cn("left-[174px] top-[260px] bg-background", dimElements && "opacity-25")}
      />
      <TreeNode
        label="Stack"
        className={cn("left-[336px] top-[260px] bg-background", dimElements && "opacity-25")}
      />
      <TreeNode
        label="Queue"
        className={cn("left-[444px] top-[260px] bg-background", dimElements && "opacity-25")}
      />
      <TreeNode
        label="Tree"
        className={cn("left-[548px] top-[260px] bg-background", dimElements && "opacity-25")}
      />
      <TreeNode
        label="Table"
        className={cn("left-[676px] top-[260px] bg-background", dimElements && "opacity-25")}
      />
      <TreeNode
        label="Graph"
        className={cn("left-[806px] top-[260px] bg-background", dimElements && "opacity-25")}
      />
    </div>
  );
}

function TreeNode({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        "absolute flex h-11 min-w-24 items-center justify-center rounded-2xl border border-border px-5 text-sm font-semibold tracking-tight text-foreground shadow-sm md:text-base",
        className
      )}
    >
      {label}
    </div>
  );
}

function RoundStepButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "back" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon-xl"
      disabled={disabled}
      onClick={onClick}
      aria-label={direction === "back" ? "Previous visual" : "Next visual"}
      className="size-18 rounded-full border-border bg-background text-foreground shadow-[0_6px_18px_rgba(0,0,0,0.18)] hover:bg-accent/60 disabled:opacity-35 md:size-20"
    >
      {direction === "back" ? <ArrowLeft className="size-7" /> : <ArrowRight className="size-7" />}
    </Button>
  );
}

const arraysCoursePath = "/dashboard/courses/array";
