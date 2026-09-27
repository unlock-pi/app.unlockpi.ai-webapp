"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useNextStep } from "nextstepjs";

import {
  ONBOARDING_QUERY_PARAM,
  ONBOARDING_QUERY_VALUE,
  ONBOARDING_TOUR_NAME,
} from "@/features/onboarding/lib/onboarding-tour";

/**
 * Watches for `?tour=start` on any page and kicks off the onboarding tour —
 * the single entry point used both by the post-signup redirect and the
 * manual "replay" menu item. Strips the param right after so a refresh (or
 * sharing the URL) doesn't restart the tour.
 */
export function OnboardingTourStarter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { startNextStep } = useNextStep();

  useEffect(() => {
    if (searchParams.get(ONBOARDING_QUERY_PARAM) !== ONBOARDING_QUERY_VALUE) {
      return;
    }

    startNextStep(ONBOARDING_TOUR_NAME);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete(ONBOARDING_QUERY_PARAM);
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // Only re-run when the param itself changes; `startNextStep`/`router` are
    // stable enough in practice and including them would refire this on
    // every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pathname]);

  return null;
}
