"use client";

import { formatLapTime, hex } from "@/lib/format";
import type { DriverPace } from "@/lib/pace";
import type { RaceModel } from "@/lib/race";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { driverToggled } from "@/store/replaySlice";
import { selectSelected } from "@/store/selectors";
import { TyreBadge } from "./ui";

const sec = (ms: number, digits = 3) => (ms / 1000).toFixed(digits);

/** Clean-lap pace ranked by median; clicking a row selects the driver everywhere. */
export function PaceTable({ model, pace }: { model: RaceModel; pace: DriverPace[] }) {
  const selected = useAppSelector(selectSelected);
  const dispatch = useAppDispatch();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-cy="pace-table">
        <caption className="sr-only">Race pace from clean green-flag laps, fastest median first</caption>
        <thead className="text-left text-xs uppercase tracking-wider text-muted">
          <tr>
            <th scope="col" className="px-3 py-2">#</th>
            <th scope="col" className="px-3 py-2">Driver</th>
            <th scope="col" className="px-3 py-2 text-right">Median</th>
            <th scope="col" className="px-3 py-2 text-right">Delta</th>
            <th scope="col" className="px-3 py-2 text-right">Best</th>
            <th scope="col" className="px-3 py-2 text-right" title="Standard deviation of clean laps">Spread</th>
            <th scope="col" className="px-3 py-2">Stints (degradation)</th>
          </tr>
        </thead>
        <tbody>
          {pace.map((row, i) => {
            const info = model.drivers.get(row.driver);
            const on = selected.has(row.driver);
            return (
              <tr
                key={row.driver}
                data-cy="pace-row"
                onClick={() => dispatch(driverToggled(row.driver))}
                className={`cursor-pointer border-t border-border hover:bg-panel-2 ${on ? "bg-panel-2" : ""}`}
              >
                <td className="tabular px-3 py-2 text-muted">{row.medianMs == null ? "—" : i + 1}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(driverToggled(row.driver));
                    }}
                    className="flex items-center gap-2 font-semibold"
                  >
                    <span aria-hidden className="h-4 w-1 rounded-sm" style={{ background: hex(info?.colour) }} />
                    {info?.acronym ?? row.driver}
                    <span className="sr-only">{info?.fullName}</span>
                  </button>
                </td>
                <td className="tabular px-3 py-2 text-right font-mono">{formatLapTime(row.medianMs)}</td>
                <td className="tabular px-3 py-2 text-right font-mono text-muted">
                  {row.deltaMs == null ? "—" : row.deltaMs === 0 ? "FASTEST" : `+${sec(row.deltaMs)}`}
                </td>
                <td className="tabular px-3 py-2 text-right font-mono">{formatLapTime(row.bestMs)}</td>
                <td className="tabular px-3 py-2 text-right font-mono text-muted">{row.spreadMs == null ? "—" : `±${sec(row.spreadMs, 2)}`}</td>
                <td className="px-3 py-2">
                  <ul className="flex flex-wrap gap-3">
                    {row.stints.map((s) => (
                      <li key={s.stint} className="flex items-center gap-1">
                        <TyreBadge name={s.compound} size="sm" />
                        <span className="tabular text-xs text-muted">
                          {s.degMsPerLap == null ? `${s.laps} laps` : `${s.degMsPerLap >= 0 ? "+" : "−"}${sec(Math.abs(s.degMsPerLap))}s/lap`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
