"use client";

import type { ReactNode } from "react";
import { CourseVoiceShell } from "@/features/courses/components/course-voice-shell";

export default function LinkedListsCourseLayout({ children }: { children: ReactNode }) {
  return (
    <CourseVoiceShell room="classroom-101" username="student-course">
      {children}
    </CourseVoiceShell>
  );
}
