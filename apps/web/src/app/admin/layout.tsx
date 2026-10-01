import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AdminShell } from "@/features/admin/components/admin-shell";
import { createClient } from "@/lib/server";
import { getSafeRedirectTarget } from "@/lib/safe-redirect";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not authenticated at all — send to login with redirectTo, not
    // /dashboard (which would just bounce them to login again anyway and
    // lose the original /admin/... destination in the process).
    const requestedPath = (await headers()).get("x-pathname");
    redirect(
      `/auth/login?redirectTo=${encodeURIComponent(
        getSafeRedirectTarget(requestedPath, "/admin"),
      )}`,
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  await supabase.rpc("touch_user_activity");

  const metadata = user.user_metadata ?? {};
  const currentUser = {
    name:
      profile.display_name ||
      (typeof metadata.full_name === "string" ? metadata.full_name : null) ||
      user.email?.split("@")[0] ||
      "Admin",
    email: user.email ?? "",
    avatarUrl:
      typeof metadata.avatar_url === "string" && metadata.avatar_url.trim()
        ? metadata.avatar_url
        : null,
  };

  return <AdminShell currentUser={currentUser}>{children}</AdminShell>;
}
