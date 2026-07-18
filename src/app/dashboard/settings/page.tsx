import Link from "next/link"
import { redirect } from "next/navigation"
import { CircleUserRoundIcon } from "lucide-react"

import { LogoutButton } from "@/features/auth/components/logout-button"
import { SettingsForm } from "@/features/settings/components/settings-form"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/server"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "User"
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <CircleUserRoundIcon className="size-16" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Review your account and update workspace preferences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LogoutButton variant="outline" />
          <Button variant="outline" render={<Link href="/dashboard/projects" />}>
            Back to projects
          </Button>
        </div>
      </div>

      <SettingsForm displayName={displayName} email={user.email ?? ""} avatarUrl={avatarUrl} />
    </section>
  )
}
