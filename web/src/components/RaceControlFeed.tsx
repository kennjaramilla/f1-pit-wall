"use client";

import { formatRaceClock } from "@/lib/format";
import type { EventKind } from "@/lib/types";
import { useAppSelector } from "@/store/hooks";
import { selectRecentEvents } from "@/store/selectors";
import { Panel } from "./ui";

const DOT: Record<EventKind, string> = {
  sc: "var(--flag-sc)",
  vsc: "var(--flag-vsc)",
  red: "var(--flag-red)",
  yellow: "var(--flag-sc)",
  green: "var(--flag-green)",
  chequered: "var(--text)",
  penalty: "var(--accent)",
  investigation: "var(--muted)",
  drs: "var(--focus)",
  weather: "var(--focus)",
};

export function RaceControlFeed() {
  const recent = useAppSelector(selectRecentEvents);
  return (
    <Panel title="Race control" id="race-control">
      {recent.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">No messages yet.</p>
      ) : (
        <ol className="divide-y divide-border" data-cy="race-control">
          {recent.map((e) => (
            <li key={`${e.t}-${e.message}`} className="flex gap-3 px-4 py-2.5 text-xs">
              <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: DOT[e.kind] }} />
              <span className="min-w-0 flex-1 leading-snug">{e.message}</span>
              <span className="tabular shrink-0 font-mono text-faint">{e.lap ? `L${e.lap}` : formatRaceClock(e.t)}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
