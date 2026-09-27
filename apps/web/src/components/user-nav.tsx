"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BellIcon,
  CircleHelpIcon,
  DoorOpenIcon,
  LogOutIcon,
  MessageSquareIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import {
  Popover,
  PopoverPopup,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ONBOARDING_QUERY_PARAM,
  ONBOARDING_QUERY_VALUE,
} from "@/features/onboarding/lib/onboarding-tour";
import { createClient } from "@/lib/client";
import { is } from "zod/v4/locales";

export type UserNavUser = {
  avatarUrl?: string | null;
  email: string;
  name: string;
};

/**
 * The top-right account cluster: notifications, then the avatar menu.
 *
 * This used to live in the sidebar footer. It moved up here so that account
 * controls sit in the same place on every surface — and so the sidebar can
 * stay purely about navigation.
 */
export function UserNav({ currentUser }: { currentUser: UserNavUser }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // next-themes reports `resolvedTheme` as undefined on the server, so the
    // icon/label can only be decided after mount without a hydration
    // mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  const [isFeelingStuckPopoverOpen, setIsFeelingStuckPopoverOpen] =
    useState(false);
  const isLightTheme = isMounted && resolvedTheme === "light";
  const userInitial = currentUser.name?.trim().charAt(0).toUpperCase() || "U";

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <Popover onOpenChange={setIsFeelingStuckPopoverOpen} open={isFeelingStuckPopoverOpen}>
        <PopoverTrigger  onClick={()=> setIsFeelingStuckPopoverOpen(isOpen => !isOpen)}
          render={<Button aria-label="Notifications" variant="ghost" />}
        >
          Feeling stuck?
          {/* <BellIcon className="size-4" aria-hidden="true" /> */}
        </PopoverTrigger>
        <PopoverPopup className="w-72" align="end">
          <PopoverTitle className="text-xs font-medium">
            Use this guide to get the most out of UnlockPi
          </PopoverTitle>

          <div className="mt-4 flex flex-col  gap-2 py-6 text-center">
            <Button
              onClick={() => {
                setIsFeelingStuckPopoverOpen(false);
              }}
              render={
                <Link
                  href={`/dashboard/projects?${ONBOARDING_QUERY_PARAM}=${ONBOARDING_QUERY_VALUE}`}
                />
              }
              className="hover:cursor-pointer"
            >
              <DoorOpenIcon className="size-4" />
              Take the tour
            </Button>
          </div>
        </PopoverPopup>
      </Popover>
      <Popover>
        <PopoverTrigger
          render={
            <Button aria-label="Notifications" size="icon" variant="ghost" />
          }
        >
          <BellIcon className="size-4" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverPopup className="w-72" align="end">
          <PopoverTitle className="text-sm font-semibold">
            Notifications
          </PopoverTitle>
          {/*
            Intentionally an empty state rather than sample rows: this is UI
            only for now, and inventing plausible-looking notifications would
            read as real activity to whoever opens it.
          */}
          <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <BellIcon className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium">You{"'"}re all caught up</p>
            <p className="text-xs text-muted-foreground">
              Updates about your classes will show up here.
            </p>
          </div>
        </PopoverPopup>
      </Popover>

      <Menu>
        <MenuTrigger
          render={
            <Button
              aria-label={`Account menu for ${currentUser.name}`}
              size="icon"
              variant="ghost"
              className="rounded-full"
            />
          }
        >
          <Avatar className="size-7 text-[11px]">
            <AvatarImage
              src={currentUser.avatarUrl ?? undefined}
              alt={currentUser.name}
            />
            <AvatarFallback className="bg-primary/12 font-semibold text-primary">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </MenuTrigger>

        <MenuPopup className="min-w-56" align="end" sideOffset={6}>
          <MenuGroup>
            <MenuGroupLabel>
              <div className="flex items-center gap-3 px-1 py-1.5 text-left">
                <Avatar className="size-9 shrink-0 text-sm">
                  <AvatarImage
                    src={currentUser.avatarUrl ?? undefined}
                    alt={currentUser.name}
                  />
                  <AvatarFallback className="bg-primary/12 font-semibold text-primary">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">
                    {currentUser.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {currentUser.email}
                  </span>
                </div>
              </div>
            </MenuGroupLabel>
          </MenuGroup>
          <MenuSeparator />
          {/* Settings lives in the sidebar footer — it's a destination, not
              an account action. */}
          <MenuItem onClick={() => setTheme(isLightTheme ? "dark" : "light")}>
            {isLightTheme ? (
              <MoonIcon className="size-4" />
            ) : (
              <SunIcon className="size-4" />
            )}
            {isLightTheme ? "Dark mode" : "Light mode"}
          </MenuItem>
          <MenuSeparator />
          {/* <MenuItem
            render={
              <Link
                href={`/dashboard/projects?${ONBOARDING_QUERY_PARAM}=${ONBOARDING_QUERY_VALUE}`}
              />
            }
          >
            <DoorOpenIcon className="size-4" />
            Take the tour
          </MenuItem> */}
          <MenuItem render={<Link href="/dashboard/help" />}>
            <CircleHelpIcon className="size-4" />
            Help
          </MenuItem>
          <MenuItem render={<Link href="/dashboard/feedback" />}>
            <MessageSquareIcon className="size-4" />
            Feedback
          </MenuItem>
          <MenuSeparator />
          <MenuItem onClick={handleLogout} className={"text-destructive"}>
            <LogOutIcon className="size-4" />
            Log out
          </MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  );
}
