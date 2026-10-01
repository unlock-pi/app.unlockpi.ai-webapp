"use client";

import { Suspense, type ReactNode } from "react";
import { NextStep, NextStepProvider } from "nextstepjs";

import { OnboardingCard } from "@/features/onboarding/components/onboarding-card";
import { OnboardingTourStarter } from "@/features/onboarding/components/onboarding-tour-starter";
import { onboardingTours } from "@/features/onboarding/lib/onboarding-tour";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  return (
    <NextStepProvider>
      <NextStep
        steps={onboardingTours}
        cardComponent={OnboardingCard}
        cardTransition={{ type: "spring", stiffness: 300, damping: 28 }}
        shadowOpacity="0.55"
        // Several steps highlight something *inside* a dialog (the name
        // field, the template picker) where the keyhole cutout only ever
        // covers that one element, not the dialog's other buttons (e.g.
        // "Create project"). NextStep's default overlay blocks clicks
        // everywhere outside the cutout, which silently ate clicks meant
        // for the rest of the dialog. The dimmed backdrop still renders;
        // only the click-blocking layer is removed. NextStep's default
        // z-index (~997-999) is intentionally left as-is here — it needs to
        // sit ABOVE this app's dialogs (z-50) so a step that targets
        // something inside one renders in front of it, not behind it.
        clickThroughOverlay
      >
        {/* useSearchParams needs a Suspense boundary; this renders nothing
            visible, so a null fallback never causes a flash. */}
        <Suspense fallback={null}>
          <OnboardingTourStarter />
        </Suspense>
        {children}
      </NextStep>
    </NextStepProvider>
  );
}
