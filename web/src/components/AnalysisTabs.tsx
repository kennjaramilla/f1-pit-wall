"use client";

import { useState } from "react";
import { requiredRole, type Permission } from "@/lib/auth/permissions";
import type { RaceModel } from "@/lib/race";
import { useAppSelector } from "@/store/hooks";
import { selectCan } from "@/store/authSlice";
import { GapChart } from "./GapChart";
import { RaceNotes } from "./RaceNotes";
import { StrategyChart } from "./StrategyChart";
import { TelemetryCompare } from "./TelemetryCompare";
import { Panel } from "./ui";

const TABS: { id: "strategy" | "gaps" | "telemetry" | "notes"; label: string; permission: Permission }[] = [
  { id: "strategy", label: "Tyre strategy", permission: "replay:view" },
  { id: "gaps", label: "Gap to leader", permission: "replay:view" },
  { id: "telemetry", label: "Telemetry", permission: "telemetry:view" },
  { id: "notes", label: "Notes", permission: "notes:edit" },
];

const LOCKED_COPY: Partial<Record<Permission, string>> = {
  "telemetry:view":
    "Fastest-lap telemetry is available to strategists. Sign in with the Strategist demo account to compare speed, throttle and braking.",
  "notes:edit": "Race notes are available to strategists. Sign in with the Strategist demo account to pin notes to laps.",
};

type Tab = (typeof TABS)[number]["id"];

/** WAI-ARIA tabs: arrow keys move between tabs, only the active one is in the tab order. */
export function AnalysisTabs({ model }: { model: RaceModel }) {
  const [tab, setTab] = useState<Tab>("strategy");
  const canTelemetry = useAppSelector((s) => selectCan(s, "telemetry:view"));
  const canNotes = useAppSelector((s) => selectCan(s, "notes:edit"));
  const allowed = (t: (typeof TABS)[number]) =>
    t.permission === "telemetry:view" ? canTelemetry : t.permission === "notes:edit" ? canNotes : true;

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
            {!allowed(t) && (
              <span
                aria-label={`(requires ${requiredRole(t.permission)} role)`}
                title={`Requires ${requiredRole(t.permission)} role`}
                className="ml-1.5"
              >
                🔒
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === "strategy" && <StrategyChart model={model} />}
        {tab === "gaps" && <GapChart model={model} />}
        {tab === "telemetry" && (canTelemetry ? <TelemetryCompare model={model} /> : <LockedFeature permission="telemetry:view" />)}
        {tab === "notes" && (canNotes ? <RaceNotes model={model} /> : <LockedFeature permission="notes:edit" />)}
      </div>
    </Panel>
  );
}

function LockedFeature({ permission }: { permission: Permission }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center" data-cy="locked-feature">
      <span aria-hidden className="text-2xl">
        🔒
      </span>
      <p className="font-semibold">Requires {requiredRole(permission)} role</p>
      <p className="max-w-sm text-sm text-muted">{LOCKED_COPY[permission]}</p>
    </div>
  );
}
