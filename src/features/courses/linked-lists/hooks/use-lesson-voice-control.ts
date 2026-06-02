"use client";

import { useClassroomRealtime } from "@/features/classroom/hooks/use-classroom-realtime";
import type { LessonControlPayload } from "@/features/classroom/lib/classroom-state";

export function useLessonVoiceControl(): LessonControlPayload | null {
  const state = useClassroomRealtime();
  return state.lessonControl;
}
