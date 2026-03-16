import { cn } from "@/lib/utils";

interface TalkBrandProps {
  isLive: boolean;
  isAgentSpeaking: boolean;
  stateLabel: string;
}

export function TalkBrand({ isLive, isAgentSpeaking, stateLabel }: TalkBrandProps) {
  return (
    <div className="flex flex-col items-center gap-1 relative z-10 flex-shrink-0">
      <div className="relative">
        <div
          className="absolute -inset-4 bg-[var(--color-orange)]/20 blur-xl rounded-full transition-all duration-500 pointer-events-none"
          style={{
            opacity: isAgentSpeaking ? 1 : 0,
            transform: isAgentSpeaking ? "scale(1)" : "scale(0.5)",
          }}
        />
        <img
          src="/unlockpi-logo.png"
          alt="UnlockPi Logo"
          className="h-14 w-auto object-contain relative z-10 drop-shadow-2xl"
        />
      </div>
      <h2 className="text-white text-xl font-bold tracking-tight">UnlockPi</h2>
      <p className="text-[var(--color-gray)] text-xs tracking-wider flex items-center gap-1.5">
        <span
          className={cn(
            "rounded-full w-2 h-2 inline-block",
            isLive ? "bg-green-400 animate-pulse" : "bg-[var(--color-dark-gray)]"
          )}
        />
        {isLive ? stateLabel : "Offline"}
      </p>
    </div>
  );
}
