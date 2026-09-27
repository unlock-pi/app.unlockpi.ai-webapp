"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AudioWaveformIcon,
  BellIcon,
  CoinsIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import Logo from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverCreateHandle,
  PopoverDescription,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { initialsOf } from "@/features/admin/lib/format";
import { createClient } from "@/lib/client";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/admin/users", label: "Users", icon: UsersIcon },
  { href: "/admin/sessions", label: "AI sessions", icon: AudioWaveformIcon },
  { href: "/admin/spend", label: "Spend", icon: CoinsIcon },
];

export type AdminShellUser = {
  name: string;
  email: string;
  avatarUrl: string | null;
};

const popoverHandle = PopoverCreateHandle<ComponentType>();

export function AdminShell({
  children,
  currentUser,
}: {
  children: ReactNode;
  currentUser: AdminShellUser;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  const NotificationsContent = () => (
    <>
      <PopoverTitle className="text-base">Notifications</PopoverTitle>
      <PopoverDescription>
        You have no new notifications at this time.
      </PopoverDescription>
    </>
  );

  const ProfileContent = () => (
    <div className="w-52 space-y-2">
      <div className="flex items-center gap-3 pb-1">
        <Avatar className="size-9 text-xs">
          <AvatarImage
            src={currentUser.avatarUrl ?? undefined}
            alt={currentUser.name}
          />
          <AvatarFallback className="bg-primary/12 font-semibold text-primary">
            {initialsOf(currentUser.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-1 font-medium text-sm">
            {currentUser.name}
          </h4>
          <p className="truncate text-muted-foreground text-xs">
            {currentUser.email}
          </p>
        </div>
      </div>
      <Button
        render={<Link href="/dashboard" />}
        className="w-full"
        size="sm"
        variant="outline"
      >
        Back to dashboard
      </Button>
      <Button
        className="w-full"
        size="sm"
        variant="outline"
        onClick={() => void signOut()}
      >
        <LogOutIcon /> Log out
      </Button>
    </div>
  );

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky w-full top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo isLink={false} full width={26} height={26} />
            <div className="h-5 w-px bg-border" />
            <p className="text-sm font-semibold tracking-tight">Admin</p>
          </div>

          {/* Underline tab-nav (p-tabs-7 style) driven by the route. */}
          <nav className="flex items-center gap-4">
            <div className="border-b! border-border flex items-center gap-1 overflow-x-auto">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="flex gap-2">
              {/* Disabled until notifications are actually wired up. */}
              <PopoverTrigger
                handle={popoverHandle}
                payload={NotificationsContent}
                render={
                  <Button
                    aria-label="Notifications"
                    size="icon"
                    variant="outline"
                    disabled
                  />
                }
              >
                <BellIcon aria-hidden="true" />
              </PopoverTrigger>

              <PopoverTrigger
                handle={popoverHandle}
                payload={ProfileContent}
                render={
                  <Button aria-label="Profile" size="icon" variant="outline" />
                }
              >
                <Avatar className="size-7 text-[10px]">
                  <AvatarImage
                    src={currentUser.avatarUrl ?? undefined}
                    alt={currentUser.name}
                  />
                  <AvatarFallback className="bg-primary/12 font-semibold text-primary">
                    {initialsOf(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
              </PopoverTrigger>

              <Popover handle={popoverHandle}>
                {({ payload: Payload }) => (
                  <PopoverPopup className="min-w-none">
                    {Payload !== undefined && <Payload />}
                  </PopoverPopup>
                )}
              </Popover>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 mt-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
