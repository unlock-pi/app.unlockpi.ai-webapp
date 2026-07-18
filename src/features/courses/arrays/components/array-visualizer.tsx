"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Mic,
  MicOff,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { LinePath } from "@visx/shape";
import { useEffect, useMemo, useState } from "react";

import { ArrayStrip } from "@/components/data-structure/array-strip";
import {
  type ArrayRealtimeUiAction,
  useArrayRealtimeTutor,
} from "@/features/courses/arrays/hooks/use-array-realtime-tutor";
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

type RuntimeArrayOverride = {
  data?: ArrayValue[];
  activeIndex?: number | null;
  caption?: string;
  highlightElements?: boolean;
  highlightIndices?: boolean;
  arrayName?: string;
  nameHint?: string;
  showIndex?: boolean;
};

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
  const frames = useMemo(
    () =>
      lesson.segment === "what-is-an-array"
        ? [...introFrames, buildCheckpointFrame(lesson.checkpoint)]
        : buildFramesFromLesson(lesson),
    [lesson]
  );
  const [frameIndex, setFrameIndex] = useState(0);
  const [runtimeOverride, setRuntimeOverride] = useState<RuntimeArrayOverride | null>(null);
  const frame = frames[frameIndex];
  const displayFrame = applyRuntimeOverride(frame, runtimeOverride);
  const canGoBack = frameIndex > 0;
  const canGoNext = frameIndex < frames.length - 1;
  const handleRealtimeUiAction = (action: ArrayRealtimeUiAction) => {
    const nextState = getNextLessonScreenState({
      action,
      frames,
      frameIndex,
      runtimeOverride,
      lesson,
    });

    setFrameIndex(nextState.frameIndex);
    setRuntimeOverride(nextState.runtimeOverride);

    return buildScreenContext({
      lesson,
      frameIndex: nextState.frameIndex,
      frameCount: frames.length,
      frame: applyRuntimeOverride(frames[nextState.frameIndex], nextState.runtimeOverride),
    });
  };
  const realtime = useArrayRealtimeTutor({
    lessonTitle: lesson.title,
    lessonGoal: lesson.lessonGoal,
    onUiAction: handleRealtimeUiAction,
  });
  const { syncScreenContext } = realtime;

  useEffect(() => {
    syncScreenContext(
      buildScreenContext({
        lesson,
        frameIndex,
        frameCount: frames.length,
        frame: displayFrame,
      })
    );
  }, [displayFrame, frameIndex, frames.length, lesson, syncScreenContext]);

  return (
    <section className="relative flex min-h-[calc(100svh-14rem)] flex-col bg-pink-700- overflow-hidden rounded-[2rem] border border-border/80 bg-card/95 text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
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
          {displayFrame.kind === "visual" ? (
            <VisualSlide frame={displayFrame} />
          ) : (
            <CheckpointSlide checkpoint={displayFrame.checkpoint} />
          )}
        </div>

        <div className="grid grid-cols-[76px_1fr_76px] items-center gap-3 md:grid-cols-[88px_1fr_88px] md:gap-4">
          <RoundStepButton
            direction="back"
            disabled={!canGoBack}
            onClick={() => {
              setRuntimeOverride(null);
              setFrameIndex((current) => Math.max(0, current - 1));
            }}
          />

          <p className="mx-auto max-w-3xl text-center text-sm leading-6 text-muted-foreground md:text-base">
            {displayFrame.caption}
          </p>

          <div className="grid justify-items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
              {frameIndex + 1} / {frames.length}
            </span>
            <RoundStepButton
              direction="next"
              disabled={!canGoNext}
              onClick={() => {
                setRuntimeOverride(null);
                setFrameIndex((current) => Math.min(frames.length - 1, current + 1));
              }}
            />
          </div>
        </div>
      </div>

      <RealtimeLessonControls realtime={realtime} />
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

function getNextLessonScreenState({
  action,
  frames,
  frameIndex,
  runtimeOverride,
  lesson,
}: {
  action: ArrayRealtimeUiAction;
  frames: ArrayFrame[];
  frameIndex: number;
  runtimeOverride: RuntimeArrayOverride | null;
  lesson: ArrayLessonDefinition;
}) {
  const currentFrame = frames[frameIndex];
  const currentData =
    currentFrame.kind === "visual"
      ? runtimeOverride?.data ?? currentFrame.data ?? valuesForFrame(currentFrame.visual)
      : lesson.cells.map((cell) => cell.value);

  switch (action.action) {
    case "next":
      return {
        frameIndex: Math.min(frames.length - 1, frameIndex + 1),
        runtimeOverride: null,
      };
    case "previous":
      return {
        frameIndex: Math.max(0, frameIndex - 1),
        runtimeOverride: null,
      };
    case "goto":
      return {
        frameIndex: clampFrameIndex(action.frame_index ?? 0, frames.length),
        runtimeOverride: null,
      };
    case "highlight_index":
      return {
        frameIndex,
        runtimeOverride: {
          ...runtimeOverride,
          data: runtimeOverride?.data,
          activeIndex: action.index,
          caption: action.caption ?? runtimeOverride?.caption,
          highlightElements: false,
          highlightIndices: false,
        },
      };
    case "highlight_indices":
      return {
        frameIndex,
        runtimeOverride: {
          ...runtimeOverride,
          data: runtimeOverride?.data,
          activeIndex: null,
          caption: action.caption ?? "Each slot has an index. The first index is 0.",
          highlightIndices: true,
          highlightElements: false,
        },
      };
    case "highlight_elements":
      return {
        frameIndex,
        runtimeOverride: {
          ...runtimeOverride,
          data: runtimeOverride?.data,
          activeIndex: null,
          caption: action.caption ?? "The boxes are the array elements. Each one stores a value.",
          highlightElements: true,
          highlightIndices: false,
        },
      };
    case "set_array":
      return {
        frameIndex,
        runtimeOverride: {
          ...runtimeOverride,
          data: action.values ?? currentData,
          activeIndex: action.index,
          caption: action.caption,
          highlightElements: false,
          highlightIndices: false,
        },
      };
    case "set_array_name":
      return {
        frameIndex,
        runtimeOverride: {
          ...runtimeOverride,
          arrayName: action.array_name?.trim() || "A",
          caption:
            action.caption ??
            `This array is now named ${action.array_name?.trim() || "A"}.`,
        },
      };
    case "show_indices":
      return {
        frameIndex,
        runtimeOverride: {
          ...runtimeOverride,
          showIndex: true,
          activeIndex: null,
          caption: action.caption ?? "These numbers are the indexes for the current array.",
          highlightIndices: true,
          highlightElements: false,
        },
      };
    case "hide_indices":
      return {
        frameIndex,
        runtimeOverride: {
          ...runtimeOverride,
          showIndex: false,
          caption: action.caption ?? "Indexes are hidden so we can focus only on the values.",
          highlightIndices: false,
        },
      };
    case "set_caption":
      return {
        frameIndex,
        runtimeOverride: {
          ...runtimeOverride,
          caption: action.caption ?? frameCaptionToText(currentFrame.caption),
        },
      };
    case "reset_array":
      return {
        frameIndex,
        runtimeOverride: null,
      };
  }
}

function applyRuntimeOverride(
  frame: ArrayFrame,
  override: RuntimeArrayOverride | null
): ArrayFrame {
  if (!override || frame.kind !== "visual") {
    return frame;
  }

  const data = override.data ?? frame.data ?? valuesForFrame(frame.visual);
  const activeIndex = override.activeIndex === null ? undefined : override.activeIndex ?? frame.activeIndex;

  return {
    ...frame,
    visual: frame.visual === "tree" ? "string-array" : frame.visual,
    data,
    caption: override.caption ?? frame.caption,
    arrayName: override.arrayName ?? frame.arrayName,
    nameHint: override.nameHint ?? frame.nameHint,
    showIndex: override.showIndex ?? frame.showIndex,
    activeIndex,
    highlightElements: override.highlightElements ?? frame.highlightElements,
    highlightIndices: override.highlightIndices ?? frame.highlightIndices,
    dimElements: override.highlightIndices ? true : frame.dimElements,
    dimIndices: override.highlightElements ? true : frame.dimIndices,
    disabledElements:
      activeIndex === undefined
        ? frame.disabledElements
        : data.reduce<number[]>((indices, _value, index) => {
            if (index !== activeIndex) {
              indices.push(index);
            }

            return indices;
          }, []),
  };
}

function buildScreenContext({
  lesson,
  frameIndex,
  frameCount,
  frame,
}: {
  lesson: ArrayLessonDefinition;
  frameIndex: number;
  frameCount: number;
  frame: ArrayFrame;
}) {
  if (frame.kind === "checkpoint") {
    return [
      `Lesson: ${lesson.title}`,
      `Frame: ${frameIndex + 1} of ${frameCount}`,
      "Screen type: checkpoint question",
      `Question: ${frame.checkpoint?.prompt ?? "No checkpoint question"}`,
      `Caption: ${frameCaptionToText(frame.caption)}`,
      "Available UI actions: next, previous, goto, set_caption.",
    ].join("\n");
  }

  const values = frame.data ?? valuesForFrame(frame.visual);
  const activeIndex =
    frame.activeIndex === undefined ? "none" : `${frame.activeIndex} (value ${values[frame.activeIndex]})`;

  return [
    `Lesson: ${lesson.title}`,
    `Frame: ${frameIndex + 1} of ${frameCount}`,
    `Screen type: ${frame.visual}`,
    `Array name: ${frame.arrayName ?? "none"}`,
    `Indexes visible: ${frame.showIndex !== false}`,
    `Visible values: [${values.join(", ")}]`,
    `Visible indices: ${values.map((_value, index) => index).join(", ")}`,
    `Highlighted index: ${activeIndex}`,
    `Highlighting all indices: ${Boolean(frame.highlightIndices)}`,
    `Highlighting all elements: ${Boolean(frame.highlightElements)}`,
    `Caption: ${frameCaptionToText(frame.caption)}`,
    "Available UI actions: next, previous, goto, highlight_index, highlight_indices, highlight_elements, set_array, set_array_name, show_indices, hide_indices, set_caption, reset_array.",
  ].join("\n");
}

function frameCaptionToText(caption: React.ReactNode) {
  if (typeof caption === "string" || typeof caption === "number") {
    return String(caption);
  }

  return "See the current visual caption on screen.";
}

function clampFrameIndex(index: number, frameCount: number) {
  return Math.max(0, Math.min(frameCount - 1, index));
}

function RealtimeLessonControls({
  realtime,
}: {
  realtime: ReturnType<typeof useArrayRealtimeTutor>;
}) {
  const isConnecting = realtime.status === "connecting";
  const statusLabel =
    realtime.status === "connected"
      ? realtime.connectionMode === "audio"
        ? "Voice replies"
        : "Listen-only"
      : realtime.status === "muted"
        ? "Muted"
        : realtime.status === "connecting"
          ? "Connecting"
          : realtime.status === "error"
            ? "Voice unavailable"
            : "Voice ready";

  return (
    <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full border border-border bg-background/85 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-md">
      <span className="hidden px-2 text-xs font-medium text-muted-foreground md:inline">
        {statusLabel}
      </span>

      {!realtime.isConnected ? (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => realtime.start("audio")}
            disabled={isConnecting}
            aria-label="Connect with voice responses"
            title={realtime.error ?? "Connect with voice responses"}
            className="rounded-full bg-primary/10 px-3 text-primary hover:bg-primary/15"
          >
            {isConnecting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Volume2 className="size-4" />
            )}
            <span className="hidden text-xs font-medium md:inline">Voice</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => realtime.start("listen_only")}
            disabled={isConnecting}
            aria-label="Connect in listen-only mode"
            title={realtime.error ?? "Connect in listen-only mode"}
            className="rounded-full bg-card px-3 text-foreground hover:bg-accent/60"
          >
            {isConnecting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <VolumeX className="size-4" />
            )}
            <span className="hidden text-xs font-medium md:inline">Listen-only</span>
          </Button>
        </>
      ) : (
        <>
          <Button
            size="icon-lg"
            variant="ghost"
            onClick={realtime.toggleMute}
            aria-label={realtime.isMuted ? "Unmute voice tutor" : "Mute voice tutor"}
            title={realtime.isMuted ? "Unmute" : "Mute"}
            className="rounded-full bg-card text-foreground hover:bg-accent/60"
          >
            {realtime.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>
          <Button
            size="icon-lg"
            variant="ghost"
            onClick={realtime.stop}
            aria-label="End voice tutor"
            title="End"
            className="rounded-full bg-card text-foreground hover:bg-accent/60"
          >
            <Square className="size-4" />
          </Button>
        </>
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
