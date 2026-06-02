"use client";

import { type ReactNode } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { LiveKitRoom, RoomAudioRenderer, StartAudio } from "@livekit/components-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLiveKitRoomConnection } from "@/features/classroom/hooks/use-livekit-room-connection";

interface CourseVoiceShellProps {
  children: ReactNode;
  room?: string;
  username?: string;
}

export function CourseVoiceShell({
  children,
  room = "classroom-101",
  username = "student-course",
}: CourseVoiceShellProps) {
  const { token, isConnecting, error, connect, disconnect } = useLiveKitRoomConnection({
    room,
    username,
  });

  const isConnected = !!token;

  return (
    <LiveKitRoom
      video={false}
      audio={true}
      token={token || undefined}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      onDisconnected={disconnect}
    >
      {children}

      <RoomAudioRenderer />
      <StartAudio label="Click to allow audio" />

      {/* Floating voice button */}
      <TooltipProvider>
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {error && (
            <div className="max-w-xs rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="icon-lg"
                  onClick={isConnected ? disconnect : connect}
                  disabled={isConnecting}
                  className={cn(
                    "size-14 rounded-full shadow-lg transition-all duration-300",
                    isConnected
                      ? "bg-primary text-primary-foreground shadow-[0_0_24px_rgba(220,38,38,0.45)] hover:bg-primary/90"
                      : isConnecting
                        ? "cursor-not-allowed opacity-70"
                        : "bg-card border border-border hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : isConnected ? (
                    <Mic className="size-5" />
                  ) : (
                    <MicOff className="size-5 text-muted-foreground" />
                  )}
                </Button>
              }
            />
            <TooltipContent side="left">
              {isConnecting
                ? "Connecting voice…"
                : isConnected
                  ? "Voice active — click to disconnect"
                  : "Enable voice interaction"}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </LiveKitRoom>
  );
}
