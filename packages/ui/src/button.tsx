"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "./utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm";
  variant?: "outline" | "ghost";
};

export function Button({ className, size, variant, type = "button", ...props }: ButtonProps) {
  return <button
    type={type}
    className={cn(
      "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-60",
      size === "sm" && "h-8 px-2.5",
      variant === "outline" ? "border-input bg-background text-foreground hover:bg-accent/50" :
        variant === "ghost" ? "border-transparent text-foreground hover:bg-accent" :
          "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      className,
    )}
    {...props}
  />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input
    className={cn("h-9 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60", className)}
    {...props}
  />;
}
