/**
 * Root layout — applies global fonts and styles.
 * Uses Manrope for body text and JetBrains Mono for code,
 * matching the Pi AI web design system.
 */

import type { Metadata } from "next";
import { Manrope, JetBrains_Mono, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import "streamdown/styles.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const interHeading = Inter({subsets:['latin'],variable:'--font-heading'});

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistMono = Geist_Mono({subsets:['latin'],variable:'--font-mono'});

export const metadata: Metadata = {
  title: "UnlockPi — AI Classroom Tutor",
  description:
    "Your AI-powered classroom assistant. Making learning fun, interactive, and unforgettable.",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/unlockpi-logo.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-mono", inter.variable, interHeading.variable, geistMono.variable)}>
      <body className="antialiased" suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
