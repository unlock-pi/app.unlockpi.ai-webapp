/**
 * Root layout — applies global fonts and styles.
 * Uses Inter for body text and Geist Mono for code,
 * matching the Pi AI web design system.
 */

import type { Metadata } from "next";
import { Geist_Mono, Inter, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "streamdown/styles.css";
import { CuelumeBinder } from "@/components/cuelume-binder";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import { OnboardingProvider } from "@/features/onboarding/components/onboarding-provider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const canvasBody = Inter({ subsets: ["latin"], variable: "--font-canvas-body" });
const canvasSubheading = Manrope({ subsets: ["latin"], variable: "--font-canvas-subheading" });
const canvasHeading = Space_Grotesk({ subsets: ["latin"], variable: "--font-canvas-heading" });

const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

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
    <html
      lang="en"
      className={cn(
        "dark font-mono",
        inter.variable,
        canvasBody.variable,
        canvasSubheading.variable,
        canvasHeading.variable,
        geistMono.variable
      )}
      suppressHydrationWarning
    >
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <ToastProvider>
            <TooltipProvider>
              <OnboardingProvider>{children}</OnboardingProvider>
            </TooltipProvider>
          </ToastProvider>
        </ThemeProvider>
        <CuelumeBinder />
      </body>
    </html>
  );
}
