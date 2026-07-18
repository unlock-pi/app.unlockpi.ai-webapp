import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";
import { createClient } from "@/lib/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return <OnboardingFlow />;
}
