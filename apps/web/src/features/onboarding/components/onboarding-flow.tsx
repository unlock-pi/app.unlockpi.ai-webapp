"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, LoaderCircleIcon, MicIcon, MicOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import Logo from "@/components/logo";
import { useOnboardingFlow } from "@/features/onboarding/hooks/use-onboarding-flow";
import { onboardingSteps } from "@/features/onboarding/lib/onboarding-steps";
import { useOpenAIRealtime } from "@/lib/openai-realtime/use-openai-realtime";
import type { RealtimeToolCall } from "@/lib/openai-realtime/types";
import { cn } from "@/lib/utils";

export function OnboardingFlow() {
  const router = useRouter();
  const { currentStep, isComplete, selectOption, stepIndex, totalSteps } =
    useOnboardingFlow();

  // This is the one place voice and click meet: the tool call just calls the
  // same selectOption the option buttons call below.
  const handleToolCall = (call: RealtimeToolCall): string => {
    if (call.name !== "select_onboarding_option") {
      return "unknown_tool";
    }
    try {
      const args = JSON.parse(call.argumentsJson) as { option_id?: string };
      if (!args.option_id || !selectOption(args.option_id)) {
        return "invalid_option";
      }
      return "ok";
    } catch {
      return "invalid_arguments";
    }
  };

  const { connect, disconnect, error, isConnected, status, updateInstructions } =
    useOpenAIRealtime({
      tokenEndpoint: "/api/openai/realtime/onboarding",
      onToolCall: handleToolCall,
    });

  // Keep the voice agent pointed at whatever question is on screen.
  useEffect(() => {
    if (!isConnected || !currentStep) {
      return;
    }
    updateInstructions(
      [
        `The current question is "${currentStep.id}": ${currentStep.question}`,
        "Options:",
        JSON.stringify(currentStep.options),
        "Read the question and options aloud now, then wait for the user's answer.",
      ].join("\n"),
    );
  }, [isConnected, currentStep, updateInstructions]);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  if (isComplete) {
    return (
      <OnboardingShell>
        <div className="grid place-items-center gap-4 py-10 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">You&apos;re all set</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll use your answers to tailor UnlockPi to how you teach.
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/projects")}>
            Go to your workspace
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  if (!currentStep) {
    return null;
  }

  return (
    <OnboardingShell>
      <div className="mb-6 flex items-center justify-center gap-1.5">
        {onboardingSteps.map((step, index) => (
          <span
            key={step.id}
            className={cn(
              "h-1.5 w-8 rounded-full transition-colors",
              index <= stepIndex ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Step {stepIndex + 1} of {totalSteps}
      </p>
      <h1 className="mt-2 text-balance text-center text-2xl font-semibold tracking-tight">
        {currentStep.question}
      </h1>

      <div className="mt-6 grid gap-2">
        {currentStep.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => selectOption(option.id)}
            className="rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium transition hover:border-primary/50 hover:bg-accent/40 active:scale-[0.99]"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-2">
        <Button
          variant={isConnected ? "secondary" : "outline"}
          onClick={() => (isConnected ? disconnect() : connect())}
        >
          {status === "connecting" ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : isConnected ? (
            <MicIcon className="size-4" />
          ) : (
            <MicOffIcon className="size-4" />
          )}
          {status === "connecting"
            ? "Connecting..."
            : isConnected
              ? "Voice guide is listening"
              : "Talk instead of clicking"}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </OnboardingShell>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
      <Card className="w-full max-w-md">
        <CardPanel className="p-8">
          <div className="mb-6 flex justify-center">
            <Logo isLink={false} width={32} height={32} />
          </div>
          {children}
        </CardPanel>
      </Card>
    </div>
  );
}
