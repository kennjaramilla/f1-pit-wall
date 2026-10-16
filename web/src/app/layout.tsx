import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Titillium_Web } from "next/font/google";
import Link from "next/link";
import { dataMode } from "@/store/f1Api";
import { StoreProvider } from "@/store/StoreProvider";
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
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-panel focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <header className="border-b border-border bg-panel/80 backdrop-blur sticky top-0 z-30">
          <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-wide uppercase">
              <span aria-hidden className="inline-block h-5 w-1.5 -skew-x-12 bg-accent" />
              <span>Pit Wall</span>
            </Link>
            <span className="hidden text-sm text-muted sm:inline">Race replay &amp; strategy</span>
            <span
              className="ml-auto rounded border border-border px-2 py-0.5 text-xs uppercase tracking-wider text-muted"
              title={dataMode === "live" ? "Data served live by the .NET API" : "Data served from a snapshot exported by the .NET API"}
            >
              {dataMode === "live" ? "Live API" : "Snapshot"}
            </span>
          </div>
        </header>
        <main id="main" className="flex-1">
          <StoreProvider>{children}</StoreProvider>
        </main>
        <footer className="border-t border-border py-4 text-center text-xs text-muted">
          Unofficial fan project. Data: OpenF1. Not affiliated with Formula 1 or the FIA.
        </footer>
      </body>
    </html>
  );
}
