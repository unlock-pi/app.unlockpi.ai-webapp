"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, MoonIcon, SunIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { play, setEnabled } from "cuelume";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { createClient } from "@/lib/client";
import {
  readSoundPreference,
  writeSoundPreference,
} from "@/lib/sound-preference";
import { useUploadThing } from "@/lib/uploadthing";

type SettingsFormProps = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

export function SettingsForm({
  displayName: initialDisplayName,
  email,
  avatarUrl: initialAvatarUrl,
}: SettingsFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [isSavingName, setIsSavingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    // next-themes reports `resolvedTheme` as undefined on the server, so this
    // one-time mount flag is required to avoid a hydration mismatch. The
    // sound preference reads from localStorage, which has the same problem,
    // so it's seeded here too rather than in useState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSoundEnabled(readSoundPreference());
  }, []);

  const isDarkTheme = isMounted && resolvedTheme === "dark";

  const handleSoundChange = (checked: boolean) => {
    setSoundEnabled(checked);
    writeSoundPreference(checked);
    setEnabled(checked);
    // Turning sounds ON plays one immediately so the choice is self-
    // demonstrating — you hear exactly what you just opted into. Turning
    // them off stays silent, which is the whole point.
    if (checked) play("success");
  };

  const { startUpload, isUploading } = useUploadThing("avatarUploader", {
    onClientUploadComplete: async (res) => {
      const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
      if (!url) return;

      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: url },
      });
      if (error) {
        toastManager.add({
          title: "Avatar not saved",
          description: error.message,
          type: "error",
        });
        return;
      }

      setAvatarUrl(url);
      toastManager.add({ title: "Avatar updated", type: "success" });
      // Re-render server components (sidebar user card) with the new avatar.
      router.refresh();
    },
    onUploadError: (error) => {
      toastManager.add({
        title: "Upload failed",
        description: error.message,
        type: "error",
      });
    },
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      void startUpload([file]);
    }
  };

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed) {
      toastManager.add({ title: "Display name required", type: "error" });
      return;
    }

    setIsSavingName(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed },
    });
    setIsSavingName(false);

    if (error) {
      toastManager.add({
        title: "Name not saved",
        description: error.message,
        type: "error",
      });
      return;
    }

    toastManager.add({ title: "Name updated", type: "success" });
    router.refresh();
  };

  return (
    <>
      <SettingsSection
        id="account"
        title="Account"
        description="Your profile as it appears across UnlockPi."
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar className="size-16 text-lg">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback>
                {displayName.slice(0, 1).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <Button
              size="icon-xs"
              variant="outline"
              className="absolute -bottom-1 -right-1 rounded-full"
              aria-label="Change avatar"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <CameraIcon className="size-3.5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {isUploading ? "Uploading..." : "PNG or JPG, up to 2MB."}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="settings-display-name">Display name</Label>
          <div className="flex gap-2">
            <Input
              id="settings-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <Button
              onClick={handleSaveName}
              disabled={isSavingName || displayName.trim() === initialDisplayName}
            >
              {isSavingName ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="settings-email">Email</Label>
          <Input id="settings-email" disabled type="email" value={email} readOnly />
        </div>
      </SettingsSection>

      <SettingsSection
        id="appearance"
        title="Appearance"
        description="How UnlockPi looks on this device."
      >
        <Label className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium">
            {isDarkTheme ? (
              <MoonIcon className="size-4" />
            ) : (
              <SunIcon className="size-4" />
            )}
            Dark mode
          </span>
          <Switch
            checked={isDarkTheme}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </Label>
      </SettingsSection>

      <SettingsSection
        id="preferences"
        title="Preferences"
        description="How UnlockPi behaves on this device."
      >
        <Label className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
          <span className="grid gap-0.5">
            <span className="flex items-center gap-2 text-sm font-medium">
              {soundEnabled ? (
                <Volume2Icon className="size-4" />
              ) : (
                <VolumeXIcon className="size-4" />
              )}
              Interaction sounds
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Short cues when arrays and stacks change — including when the AI
              changes them during a class.
            </span>
          </span>
          <Switch
            checked={soundEnabled}
            aria-label="Toggle interaction sounds"
            onCheckedChange={(checked) => handleSoundChange(Boolean(checked))}
          />
        </Label>
      </SettingsSection>
    </>
  );
}
