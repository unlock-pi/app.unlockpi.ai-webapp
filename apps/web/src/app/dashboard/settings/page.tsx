import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { CircleUserRoundIcon } from "lucide-react"

import { LogoutButton } from "@/features/auth/components/logout-button"
import { PersonalizationForm } from "@/features/settings/components/personalization-form"
import { SettingsExpandToggle } from "@/features/settings/components/settings-expand-toggle"
import { SettingsForm } from "@/features/settings/components/settings-form"
import { SettingsSectionsProvider } from "@/features/settings/components/settings-sections-context"
import { DEFAULT_PERSONALIZATION, type Personalization } from "@/features/settings/types/personalization-types"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/server"
import { getSafeRedirectTarget } from "@/lib/safe-redirect"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    const requestedPath = (await headers()).get("x-pathname")
    redirect(
      `/auth/login?redirectTo=${encodeURIComponent(
        getSafeRedirectTarget(requestedPath, "/dashboard/settings"),
      )}`,
    )
  }

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "User"
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null

  const { data: personalizationRow } = await supabase
    .from("user_personalization")
    .select("nickname, about_you, custom_instructions, warmth, enthusiasm")
    .eq("owner_id", user.id)
    .maybeSingle()

  const personalization: Personalization = personalizationRow ?? DEFAULT_PERSONALIZATION

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <SettingsSectionsProvider>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            {/* <CircleUserRoundIcon className="size-16" /> */}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">
                Review your account and update workspace preferences.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SettingsExpandToggle />
            <LogoutButton variant="destructive" />
            {/* <Button variant="outline" render={<Link href="/dashboard/projects" />}>
              Back to projects
            </Button> */}
          </div>
        </div>

        <div className="grid gap-4">
          <SettingsForm displayName={displayName} email={user.email ?? ""} avatarUrl={avatarUrl} />
          <PersonalizationForm initial={personalization} />
        </div>
      </SettingsSectionsProvider>
    </section>
  )
}
