import { Suspense } from "react";

import { AuthPage } from "@/features/auth/components/auth-page";

export default function LoginPage() {
  // AuthPage reads the `redirectTo` query param via useSearchParams(), which
  // Next.js requires to sit inside a Suspense boundary — otherwise the whole
  // route de-opts to fully client-rendered.
  return (
    <Suspense>
      <AuthPage />
    </Suspense>
  );
}
