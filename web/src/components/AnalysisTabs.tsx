"use client";

import { useState } from "react";
import type { RaceModel } from "@/lib/race";
import { GapChart } from "./GapChart";
import { StrategyChart } from "./StrategyChart";
import { TelemetryCompare } from "./TelemetryCompare";
import { Panel } from "./ui";

const TABS = [
  { id: "strategy", label: "Tyre strategy" },
  { id: "gaps", label: "Gap to leader" },
  { id: "telemetry", label: "Telemetry" },
] as const;

type Tab = (typeof TABS)[number]["id"];

/** WAI-ARIA tabs: arrow keys move between tabs, only the active one is in the tab order. */
export function AnalysisTabs({ model }: { model: RaceModel }) {
  const [tab, setTab] = useState<Tab>("strategy");

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = TABS[(index + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    setTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <Panel className="mt-4">
      <div role="tablist" aria-label="Analysis" className="flex gap-1 overflow-x-auto border-b border-border px-2">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            data-cy={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === t.id ? "border-accent text-text" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === "strategy" && <StrategyChart model={model} />}
        {tab === "gaps" && <GapChart model={model} />}
        {tab === "telemetry" && <TelemetryCompare model={model} />}
      </div>
    </Panel>
  );
}
