import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { createClient } from "@/lib/server";

const dashboardShellStyle = {
  "--sidebar-width": "calc(var(--spacing) * 72)",
  "--header-height": "calc(var(--spacing) * 12)",
} as CSSProperties;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  await supabase.rpc("touch_user_activity");

  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email ||
    "User";
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null;

  return (
    <DashboardShell
      shellStyle={dashboardShellStyle}
      currentUser={{
        avatarUrl,
        email: user.email ?? "",
        name: displayName,
      }}
    >
      {children}
    </DashboardShell>
  );
}
