/**
 * Root layout — applies global fonts and styles.
 * Uses Manrope for body text and JetBrains Mono for code,
 * matching the Pi AI web design system.
 */

import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "streamdown/styles.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UnlockPi — AI Classroom Tutor",
  description:
    "Your AI-powered classroom assistant. Making learning fun, interactive, and unforgettable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link
          href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning> <TooltipProvider>{children}</TooltipProvider></body>
    </html>
  );
}
