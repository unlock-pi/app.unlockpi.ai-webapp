export type TraitLevel = -2 | -1 | 0 | 1 | 2;

export type Personalization = {
  nickname: string | null;
  about_you: string | null;
  custom_instructions: string | null;
  warmth: TraitLevel;
  enthusiasm: TraitLevel;
};

export const DEFAULT_PERSONALIZATION: Personalization = {
  nickname: null,
  about_you: null,
  custom_instructions: null,
  warmth: 0,
  enthusiasm: 0,
};
