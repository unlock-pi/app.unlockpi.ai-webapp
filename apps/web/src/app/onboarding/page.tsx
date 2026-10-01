import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";
import { createClient } from "@/lib/server";
import { getSafeRedirectTarget } from "@/lib/safe-redirect";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const requestedPath = (await headers()).get("x-pathname");
    redirect(
      `/auth/login?redirectTo=${encodeURIComponent(
        getSafeRedirectTarget(requestedPath, "/onboarding"),
      )}`,
    );
  }

  return <OnboardingFlow />;
}
