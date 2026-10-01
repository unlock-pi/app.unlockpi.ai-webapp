"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { XIcon } from "lucide-react";
import type { CardComponentProps } from "nextstepjs";

import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { TypewriterReveal } from "@/features/onboarding/components/onboarding-typewriter";
import { cn } from "@/lib/utils";

/**
 * Custom NextStep card. Title and content type out in sequence instead of
 * appearing all at once — a card that just pops with a full paragraph reads
 * as noise, and gets clicked past without being read. The progress dots and
 * the action (Next/Finish, or the "try it" hint) only render once the text
 * has actually finished typing, so there's nothing to mindlessly click
 * through before the copy has had a chance to be seen.
 *
 * Steps that require a real action (everything but the last one) show no
 * "Next" button at all — there is nothing for the tour itself to advance
 * on. The app navigating for real is what moves the tour forward (see the
 * `setCurrentStep` calls where each destination component mounts/opens).
 */
export function OnboardingCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  skipTour,
  arrow,
}: CardComponentProps) {
  const isLastStep = currentStep === totalSteps - 1;
  const contentText = typeof step.content === "string" ? step.content : null;

  const [isTitleDone, setIsTitleDone] = useState(false);
  const [isContentDone, setIsContentDone] = useState(!contentText);
  // Tracks which step's reveal the two flags above belong to. When the step
  // changes, reset them during render (React's documented pattern for
  // "adjusting state when a prop changes") rather than in an effect, which
  // would otherwise flash the previous step's finished state for one frame.
  const [revealedForTitle, setRevealedForTitle] = useState(step.title);

  if (revealedForTitle !== step.title) {
    setRevealedForTitle(step.title);
    setIsTitleDone(false);
    setIsContentDone(!contentText);
  }

  return (
    <Card className="w-[320px] gap-0 border-primary/15 py-0 shadow-xl shadow-black/10">
      {arrow}
      <CardPanel className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {step.icon ? (
              <span className="text-base leading-none">{step.icon}</span>
            ) : null}
            <h3 className="text-sm font-semibold text-foreground">
              <TypewriterReveal
                key={step.title}
                text={step.title}
                speed={26}
                onComplete={() => setIsTitleDone(true)}
              />
            </h3>
          </div>
          {skipTour ? (
            <button
              type="button"
              onClick={skipTour}
              aria-label="Skip tour"
              className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : null}
        </div>

        <p className="min-h-10 text-sm leading-5 text-muted-foreground">
          {isTitleDone ? (
            contentText ? (
              <TypewriterReveal
                key={step.title}
                text={contentText}
                speed={13}
                onComplete={() => setIsContentDone(true)}
              />
            ) : (
              step.content
            )
          ) : null}
        </p>

        {isContentDone ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mt-1 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <motion.span
                  key={index}
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className={cn(
                    "h-1.5 rounded-full",
                    index === currentStep
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-border",
                  )}
                />
              ))}
            </div>

            {isLastStep ? (
              <Button size="sm" onClick={nextStep}>
                Got it
              </Button>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                Try it to continue
              </span>
            )}
          </motion.div>
        ) : (
          // Reserves the footer's height while typing so the card doesn't
          // grow/jump the instant the reveal finishes.
          <div className="mt-1 h-7" aria-hidden="true" />
        )}
      </CardPanel>
    </Card>
  );
}
