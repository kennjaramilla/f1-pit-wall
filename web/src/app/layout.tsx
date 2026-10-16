import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Titillium_Web } from "next/font/google";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const titillium = Titillium_Web({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-titillium" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "Pit Wall · Race replay & strategy",
  description: "Replay a Grand Prix like a race strategist: live track map, timing tower, tyre strategy, gaps and telemetry.",
};

export const viewport: Viewport = { themeColor: "#0a0c0f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${titillium.variable} ${jetbrains.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-panel focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Suspense fallback={<div className="h-14 border-b border-border bg-panel" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
        <footer className="border-t border-border py-4 text-center text-xs text-muted">
          Unofficial fan project. Data: OpenF1. Not affiliated with Formula 1 or the FIA.
        </footer>
      </body>
    </html>
  );
}
