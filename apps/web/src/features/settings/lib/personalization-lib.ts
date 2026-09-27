import type { TraitLevel } from "@/features/settings/types/personalization-types";

const WARMTH_LABELS: Record<TraitLevel, string> = {
  [-2]: "Strictly professional",
  [-1]: "More professional",
  0: "Default",
  1: "More warm",
  2: "Very warm and personal",
};

const ENTHUSIASM_LABELS: Record<TraitLevel, string> = {
  [-2]: "Very calm",
  [-1]: "More calm",
  0: "Default",
  1: "More energetic",
  2: "Very energetic and excited",
};

export function getWarmthLabel(level: TraitLevel): string {
  return WARMTH_LABELS[level];
}

export function getEnthusiasmLabel(level: TraitLevel): string {
  return ENTHUSIASM_LABELS[level];
}

export function isTraitLevel(value: number): value is TraitLevel {
  return Number.isInteger(value) && value >= -2 && value <= 2;
}

export const ABOUT_YOU_MAX_LENGTH = 1500;
export const CUSTOM_INSTRUCTIONS_MAX_LENGTH = 1500;
export const NICKNAME_MAX_LENGTH = 50;
