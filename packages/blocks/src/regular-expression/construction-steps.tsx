"use client";

import type { RegularExpressionConstructionStep } from "./types";
import { cn } from "@unlockpi/ui";

type ConstructionStepsProps = {
  steps?: RegularExpressionConstructionStep[];
  currentStep?: number;
  className?: string;
};

const operationLabel = (step: RegularExpressionConstructionStep) =>
  (step.operation ?? step.title).replaceAll("-", " ");

/** Presents supplied construction milestones; it never constructs an automaton. */
export function ConstructionSteps({
  steps = [],
  currentStep = 0,
  className,
}: ConstructionStepsProps) {
  if (!steps.length) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        Construction steps will appear when they are supplied.
      </p>
    );
  }

  const index = Math.max(0, Math.min(currentStep, steps.length - 1));
  const current = steps[index];
  const createdStates = current.createdStateIds?.length ?? 0;
  const createdTransitions = current.createdTransitionIds?.length ?? 0;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-border/70 bg-muted/10",
        className,
      )}
      aria-label="Thompson construction steps"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Thompson construction
          </h3>
          <p className="text-xs text-muted-foreground">
            Build the ε-NFA one AST operation at a time.
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          Step {index + 1} of {steps.length}
        </span>
      </header>

      <div className="grid gap-4 p-4">
        <div
          className="flex gap-1"
          role="progressbar"
          aria-label="Construction progress"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={index + 1}
        >
          {steps.map((step, stepIndex) => (
            <span
              key={step.id}
              className={cn(
                "h-1.5 min-w-2 flex-1 rounded-full transition-colors",
                stepIndex < index && "bg-primary/45",
                stepIndex === index && "bg-primary",
                stepIndex > index && "bg-border",
              )}
            />
          ))}
        </div>

        <article className="rounded-xl border border-primary/25 bg-background px-4 py-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              {operationLabel(current)}
            </p>
            {createdStates || createdTransitions ? (
              <p className="text-[11px] text-muted-foreground">
                +{createdStates} states · +{createdTransitions} transitions
              </p>
            ) : null}
          </div>
          <h4 className="mt-1 text-base font-semibold text-foreground">
            {current.title}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {current.description}
          </p>
        </article>

        <ol
          className="flex max-w-full gap-2 overflow-x-auto pb-1"
          aria-label="Construction timeline"
        >
          {steps.map((step, stepIndex) => (
            <li
              key={step.id}
              aria-current={stepIndex === index ? "step" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                stepIndex === index
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : stepIndex < index
                    ? "border-border/60 bg-muted/40 text-foreground"
                    : "border-border/60 bg-background text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full bg-muted font-mono text-[10px] font-bold",
                  stepIndex === index && "bg-primary text-primary-foreground",
                )}
              >
                {stepIndex + 1}
              </span>
              <span className="max-w-32 truncate capitalize">
                {operationLabel(step)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
