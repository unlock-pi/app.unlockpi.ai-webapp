"use client";

import { useRef, useState } from "react";
import { CheckCircle2, XCircle, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LLCheckpoint } from "../lib/linked-list-course";

// ---------------------------------------------------------------------------
// Multiple Choice
// ---------------------------------------------------------------------------
interface MultipleChoiceProps {
  checkpoint: LLCheckpoint;
  onComplete: () => void;
}

export function MultipleChoiceCheckpoint({ checkpoint, onComplete }: MultipleChoiceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  const correct = selected === checkpoint.correctAnswer;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">{checkpoint.prompt}</h3>
      <div className="grid gap-2.5">
        {checkpoint.options.map((opt) => {
          const isSelected = selected === opt.id;
          const isCorrect = opt.id === checkpoint.correctAnswer;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={answered}
              onClick={() => setSelected(opt.id)}
              className={cn(
                "group flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all duration-200",
                !answered && "hover:border-primary/40 hover:bg-primary/5 hover:shadow-[0_0_12px_rgba(220,38,38,0.08)]",
                isSelected && !answered && "border-primary/50 bg-primary/10",
                answered && isCorrect &&
                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.1)]",
                answered && isSelected && !isCorrect &&
                  "border-rose-500/40 bg-rose-500/8 text-rose-300"
              )}
            >
              {answered && isCorrect && (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-400 animate-in zoom-in duration-200" />
              )}
              {answered && isSelected && !isCorrect && (
                <XCircle className="size-4 shrink-0 text-rose-400 animate-in zoom-in duration-200" />
              )}
              {!answered && (
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border/60 bg-muted/30 text-muted-foreground"
                  )}
                >
                  {opt.id.toUpperCase()}
                </span>
              )}
              {opt.label}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
            correct
              ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-100"
              : "border-amber-500/30 bg-amber-500/8 text-amber-100"
          )}
        >
          {correct ? "✓ Correct! " : "Not quite — "}
          {checkpoint.explanation}
        </div>
      )}

      {answered && (
        <Button
          onClick={onComplete}
          className="gap-2 shadow-[0_0_16px_rgba(220,38,38,0.2)] hover:shadow-[0_0_24px_rgba(220,38,38,0.35)] animate-in fade-in duration-300"
        >
          Continue →
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drag-to-order
// ---------------------------------------------------------------------------
interface DragOrderProps {
  checkpoint: LLCheckpoint;
  onComplete: () => void;
}

export function DragOrderCheckpoint({ checkpoint, onComplete }: DragOrderProps) {
  const correctIds = checkpoint.correctAnswer.split(",");
  const [items, setItems] = useState(() => [...checkpoint.options]);
  const [submitted, setSubmitted] = useState(false);
  const [slotCorrect, setSlotCorrect] = useState<boolean[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const dragIndex = useRef<number | null>(null);

  function handleDragStart(index: number) {
    dragIndex.current = index;
    setDragging(index);
  }

  function handleDragEnd() {
    setDragging(null);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex.current === null || dragIndex.current === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    dragIndex.current = null;
    setDragging(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleSubmit() {
    const results = items.map((item, i) => item.id === correctIds[i]);
    setSlotCorrect(results);
    setSubmitted(true);
  }

  const allCorrect = submitted && slotCorrect.every(Boolean);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">{checkpoint.prompt}</h3>
      <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
        Drag to reorder, then submit
      </p>
      <div className="grid gap-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
            className={cn(
              "flex cursor-grab items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all duration-200 select-none",
              "active:cursor-grabbing",
              !submitted && dragging !== index &&
                "border-border/70 bg-background/40 hover:border-primary/30 hover:bg-primary/5",
              !submitted && dragging === index &&
                "border-primary/50 bg-primary/10 opacity-60 scale-[0.98]",
              submitted && slotCorrect[index] &&
                "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
              submitted && !slotCorrect[index] &&
                "border-rose-500/40 bg-rose-500/8 text-rose-300"
            )}
          >
            <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
            <span className="flex size-6 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground">
              {index + 1}
            </span>
            <span className="flex-1">{item.label}</span>
            {submitted && (
              <span className="ml-auto flex items-center gap-1.5 text-xs">
                {slotCorrect[index] ? (
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                ) : (
                  <span className="text-rose-300/70">
                    → {checkpoint.options.find((o) => o.id === correctIds[index])?.label}
                  </span>
                )}
              </span>
            )}
          </div>
        ))}
      </div>

      {submitted && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
            allCorrect
              ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-100"
              : "border-amber-500/30 bg-amber-500/8 text-amber-100"
          )}
        >
          {allCorrect ? "✓ Perfect order! " : "Almost — "}
          {checkpoint.explanation}
        </div>
      )}

      {!submitted ? (
        <Button
          onClick={handleSubmit}
          className="gap-2 hover:shadow-[0_0_16px_rgba(220,38,38,0.25)]"
        >
          Check order
        </Button>
      ) : (
        <Button
          onClick={onComplete}
          className="gap-2 shadow-[0_0_16px_rgba(220,38,38,0.2)] hover:shadow-[0_0_24px_rgba(220,38,38,0.35)] animate-in fade-in duration-300"
        >
          Continue →
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Multi-select
// ---------------------------------------------------------------------------
interface MultiSelectProps {
  checkpoint: LLCheckpoint;
  onComplete: () => void;
}

export function MultiSelectCheckpoint({ checkpoint, onComplete }: MultiSelectProps) {
  const correctIds = new Set(checkpoint.correctAnswer.split(","));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  function toggle(id: string) {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allCorrect =
    submitted &&
    selected.size === correctIds.size &&
    [...selected].every((id) => correctIds.has(id));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold tracking-tight">{checkpoint.prompt}</h3>
      <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">
        Select all that apply, then submit
      </p>
      <div className="flex flex-wrap gap-2.5">
        {checkpoint.options.map((opt) => {
          const isSelected = selected.has(opt.id);
          const isCorrect = correctIds.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={cn(
                "rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                !submitted && !isSelected &&
                  "border-border/70 bg-background/40 hover:border-primary/40 hover:bg-primary/5",
                !submitted && isSelected &&
                  "border-primary/60 bg-primary/12 text-primary shadow-[0_0_10px_rgba(220,38,38,0.15)]",
                submitted && isCorrect &&
                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
                submitted && !isCorrect && isSelected &&
                  "border-rose-500/40 bg-rose-500/8 text-rose-300",
                submitted && !isCorrect && !isSelected && "border-border/40 bg-background/20 opacity-40"
              )}
            >
              {opt.label}
              {submitted && isCorrect && " ✓"}
              {submitted && !isCorrect && isSelected && " ✗"}
            </button>
          );
        })}
      </div>

      {submitted && (
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm leading-6 animate-in fade-in slide-in-from-bottom-2 duration-300",
            allCorrect
              ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-100"
              : "border-amber-500/30 bg-amber-500/8 text-amber-100"
          )}
        >
          {allCorrect ? "✓ Correct! " : "Not quite — "}
          {checkpoint.explanation}
        </div>
      )}

      {!submitted ? (
        <Button
          onClick={() => setSubmitted(true)}
          disabled={selected.size === 0}
          className="gap-2 hover:shadow-[0_0_16px_rgba(220,38,38,0.25)]"
        >
          Submit answer
        </Button>
      ) : (
        <Button
          onClick={onComplete}
          className="gap-2 shadow-[0_0_16px_rgba(220,38,38,0.2)] hover:shadow-[0_0_24px_rgba(220,38,38,0.35)] animate-in fade-in duration-300"
        >
          Continue →
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
interface CheckpointProps {
  checkpoint: LLCheckpoint;
  onComplete: () => void;
}

export function LLCheckpointWidget({ checkpoint, onComplete }: CheckpointProps) {
  if (checkpoint.type === "multiple-choice") {
    return <MultipleChoiceCheckpoint checkpoint={checkpoint} onComplete={onComplete} />;
  }
  if (checkpoint.type === "drag-order") {
    return <DragOrderCheckpoint checkpoint={checkpoint} onComplete={onComplete} />;
  }
  return <MultiSelectCheckpoint checkpoint={checkpoint} onComplete={onComplete} />;
}
