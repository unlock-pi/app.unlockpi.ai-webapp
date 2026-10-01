"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import {
  ABOUT_YOU_MAX_LENGTH,
  CUSTOM_INSTRUCTIONS_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  getEnthusiasmLabel,
  getWarmthLabel,
  isTraitLevel,
} from "@/features/settings/lib/personalization-lib";
import { SettingsSection } from "@/features/settings/components/settings-section";
import type {
  Personalization,
  TraitLevel,
} from "@/features/settings/types/personalization-types";
import { createClient } from "@/lib/client";

type PersonalizationFormProps = {
  initial: Personalization;
};

export function PersonalizationForm({ initial }: PersonalizationFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initial.nickname ?? "");
  const [aboutYou, setAboutYou] = useState(initial.about_you ?? "");
  const [customInstructions, setCustomInstructions] = useState(
    initial.custom_instructions ?? "",
  );
  const [warmth, setWarmth] = useState<TraitLevel>(initial.warmth);
  const [enthusiasm, setEnthusiasm] = useState<TraitLevel>(initial.enthusiasm);
  const [isSaving, setIsSaving] = useState(false);

  const isDirty =
    nickname !== (initial.nickname ?? "") ||
    aboutYou !== (initial.about_you ?? "") ||
    customInstructions !== (initial.custom_instructions ?? "") ||
    warmth !== initial.warmth ||
    enthusiasm !== initial.enthusiasm;

  const handleSave = async () => {
    setIsSaving(true);

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      toastManager.add({
        title: "Please sign in again to save personalization.",
        type: "error",
      });
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("user_personalization").upsert(
      {
        owner_id: user.id,
        nickname: nickname.trim() || null,
        about_you: aboutYou.trim() || null,
        custom_instructions: customInstructions.trim() || null,
        warmth,
        enthusiasm,
      },
      { onConflict: "owner_id" },
    );

    setIsSaving(false);

    if (error) {
      toastManager.add({
        title: "Personalization not saved",
        description: error.message,
        type: "error",
      });
      return;
    }

    toastManager.add({ title: "Personalization saved", type: "success" });
    router.refresh();
  };

  return (
    <SettingsSection
      id="personalization"
      title="Personalization"
      description="Shape the tone the AI uses when it talks with you."
    >
      <TraitSlider
        label="Warmth"
        value={warmth}
        onChange={setWarmth}
        minLabel="Professional"
        maxLabel="Warm"
        getLabel={getWarmthLabel}
      />

      <TraitSlider
        label="Enthusiasm"
        value={enthusiasm}
        onChange={setEnthusiasm}
        minLabel="Calm"
        maxLabel="Enthusiastic"
        getLabel={getEnthusiasmLabel}
      />

      <div className="grid gap-2">
        <Label htmlFor="personalization-custom-instructions">
          Custom instructions
        </Label>
        <Textarea
          id="personalization-custom-instructions"
          value={customInstructions}
          onChange={(event) => setCustomInstructions(event.target.value)}
          maxLength={CUSTOM_INSTRUCTIONS_MAX_LENGTH}
          className="min-h-24"
          placeholder="Anything specific you want the AI to do — pacing, examples you like, topics to skip."
        />
      </div>

      <div className="grid gap-2 border-t border-border pt-6">
        <Label htmlFor="personalization-nickname">Nickname</Label>
        <Input
          id="personalization-nickname"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          maxLength={NICKNAME_MAX_LENGTH}
          placeholder="What should the AI call you?"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="personalization-about-you">About you</Label>
        <Textarea
          id="personalization-about-you"
          value={aboutYou}
          onChange={(event) => setAboutYou(event.target.value)}
          maxLength={ABOUT_YOU_MAX_LENGTH}
          className="min-h-24"
          placeholder="Grade level, subject, learning style — anything that helps the AI teach you better."
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? "Saving..." : "Save personalization"}
        </Button>
      </div>
    </SettingsSection>
  );
}

type TraitSliderProps = {
  label: string;
  value: TraitLevel;
  onChange: (value: TraitLevel) => void;
  minLabel: string;
  maxLabel: string;
  getLabel: (value: TraitLevel) => string;
};

function TraitSlider({
  label,
  value,
  onChange,
  minLabel,
  maxLabel,
  getLabel,
}: TraitSliderProps) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-xs font-medium text-muted-foreground">
          {getLabel(value)}
        </span>
      </div>
      <Slider
        min={-2}
        max={2}
        step={1}
        value={value}
        onValueChange={(next) => {
          const nextValue = Array.isArray(next) ? next[0] : next;
          if (isTraitLevel(nextValue)) {
            onChange(nextValue);
          }
        }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
