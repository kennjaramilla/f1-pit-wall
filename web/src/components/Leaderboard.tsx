"use client";

import { useMemo } from "react";
import { formatGap, hex } from "@/lib/format";
import { positionAt, type RaceModel } from "@/lib/race";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { driverToggled } from "@/store/replaySlice";
import { selectLeaderboard, selectRaceTime, selectSelected } from "@/store/selectors";
import { TyreBadge } from "./ui";

const ROW_H = 36;

/** Timing tower synced to the replay clock. Rows slide to their new slot when positions change. */
export function Leaderboard({ model }: { model: RaceModel }) {
  const rows = useAppSelector(selectLeaderboard);
  const started = useAppSelector((s) => selectRaceTime(s) > 0);
  const selected = useAppSelector(selectSelected);
  const dispatch = useAppDispatch();
  const grid = useMemo(() => new Map(model.bundle.drivers.map((d) => [d.number, positionAt(model, d.number, 0) ?? 0])), [model]);
  const anySelected = selected.size > 0;

  // Stable DOM order (by car number) + translateY gives smooth reordering without remounts.
  const slot = new Map(rows.map((r, i) => [r.driver.number, i]));
  const stable = [...rows].sort((a, b) => a.driver.number - b.driver.number);

  return (
    <div className="text-sm" data-cy="leaderboard">
      <div className="grid grid-cols-[2rem_1fr_6.5rem_3.5rem_2.5rem] items-center gap-2 border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <span>Pos</span>
        <span>Driver</span>
        <span className="text-right">Gap</span>
        <span>Tyre</span>
        <span className="text-right" title="Pit stops">
          Pit
        </span>
      </div>
      <ol className="relative" style={{ height: rows.length * ROW_H }} aria-label="Running order">
        {stable.map((r) => {
          const i = slot.get(r.driver.number) ?? 0;
          const isSel = selected.has(r.driver.number);
          const delta = (grid.get(r.driver.number) ?? r.position) - r.position;
          return (
            <li
              key={r.driver.number}
              className="absolute inset-x-0 transition-transform duration-500 ease-out"
              style={{ transform: `translateY(${i * ROW_H}px)`, height: ROW_H }}
              aria-posinset={r.position}
              aria-setsize={rows.length}
            >
              <button
                type="button"
                onClick={() => dispatch(driverToggled(r.driver.number))}
                aria-pressed={isSel}
                                title={`${r.driver.fullName} · ${r.driver.team}`}
                data-cy="leaderboard-row"
                className={`grid h-full w-full grid-cols-[2rem_1fr_6.5rem_3.5rem_2.5rem] items-center gap-2 px-3 text-left transition-colors hover:bg-panel-2 ${
                  isSel ? "bg-panel-3" : ""
                } ${anySelected && !isSel ? "opacity-55" : ""} ${r.retired ? "opacity-45" : ""}`}
              >
                <span className="tabular font-bold">{r.retired ? "—" : r.position}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-5 w-1 shrink-0 rounded-sm"
                    style={{
                      background: r.secondary
                        ? `repeating-linear-gradient(180deg, ${hex(r.driver.colour)} 0 3px, transparent 3px 5px)`
                        : hex(r.driver.colour),
                    }}
                  />
                  <span className="font-bold tracking-wide">{r.driver.acronym}</span>
                  {delta !== 0 && !r.retired && started && (
                    <span
                      className={`tabular text-[11px] ${delta > 0 ? "text-green" : "text-red"}`}
                      title={`${Math.abs(delta)} places ${delta > 0 ? "gained" : "lost"} since the start`}
                    >
                      {delta > 0 ? "▲" : "▼"}
                      {Math.abs(delta)}
                    </span>
                  )}
                </span>
                <span className="tabular text-right font-mono text-xs">
                  {r.retired ? (
                    <span className="rounded bg-panel-3 px-1.5 py-0.5 font-sans font-semibold text-muted">OUT</span>
                  ) : r.inPit ? (
                    <span className="rounded bg-sc px-1.5 py-0.5 font-sans font-bold text-black">IN PIT</span>
                  ) : (
                    formatGap(r.gap.gapSec, r.gap.lapsDown, r.position === 1)
                  )}
                </span>
                <span>
                  <TyreBadge name={r.compound} age={r.tyreAge} size="sm" />
                </span>
                <span className="tabular text-right text-muted">{r.stops}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
