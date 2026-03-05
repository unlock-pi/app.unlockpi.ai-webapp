"use client";

import { Button } from "@/components/ui/button";

interface ConnectionScreenProps {
    connect: () => void;
    isConnecting: boolean;
    error: string | null;
}

export function ConnectionScreen({ connect, isConnecting, error }: ConnectionScreenProps) {
    return (
        <div className="flex flex-col items-center  gap-3 relative z-10 mb-20">
            {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                    {error}
                </div>
            )}
            <Button
                onClick={connect}
                disabled={isConnecting}
                className="px-8 py-4 w-96 rounded-2xl font-semibold text-lg transition-all duration-300
                       bg-[var(--color-orange)] text-white
                       hover:shadow-[0_0_40px_rgba(220,38,38,0.4)]
                       hover:brightness-110 active:scale-[0.98]
                       disabled:opacity-60 disabled:cursor-not-allowed"
            >
                {isConnecting ? (
                    <span className="flex items-center gap-3">
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Connecting...
                    </span>
                ) : (
                    <span className="flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Connect
                    </span>
                )}
            </Button>
            <p className="text-[var(--color-dark-gray)] text-xs">
                Room: classroom-101
            </p>
        </div>
    );
}
