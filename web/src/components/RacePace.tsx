"use client";

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { formatLapTime, hex } from "@/lib/format";
import type { DriverPace } from "@/lib/pace";
import type { RaceModel } from "@/lib/race";
import { useSize } from "@/lib/useSize";
import { useAppSelector } from "@/store/hooks";
import { selectRacePace, selectSelected } from "@/store/selectors";
import { PaceTable } from "./PaceTable";
import { EmptyState } from "./ui";

const M = { top: 12, right: 16, bottom: 28, left: 64 };
const HEIGHT = 300;
const DEFAULT_SHOWN = 5;

/** Race pace tab: lap times of the selected drivers (or the fastest five) and the ranked table. */
export function RacePace({ model }: { model: RaceModel }) {
  const pace = useAppSelector(selectRacePace);
  const selected = useAppSelector(selectSelected);
  const ranked = pace.filter((p) => p.laps.length > 0);
  if (ranked.length === 0) return <EmptyState>No clean green-flag laps in this race yet.</EmptyState>;
  const shown = selected.size > 0 ? ranked.filter((p) => selected.has(p.driver)) : ranked.slice(0, DEFAULT_SHOWN);

  return (
    <div className="px-4 pb-4" data-cy="race-pace">
      <p className="py-3 text-xs text-muted">
        Green-flag laps only: lap 1, pit in and out laps, safety car and VSC laps, and laps more than 7% off a driver&apos;s median are left
        out. A negative stint trend means fuel burn-off outweighed tyre wear.{" "}
        {selected.size > 0 ? "Showing your selected drivers." : `Showing the fastest ${shown.length}; select drivers to compare.`}
      </p>
      <LapTimeChart model={model} series={shown} />
      <PaceTable model={model} pace={pace} />
    </div>
  );
}

function LapTimeChart({ model, series }: { model: RaceModel; series: DriverPace[] }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const times = series.flatMap((s) => s.laps.map((l) => l.durationMs));
  const lo = times.length ? Math.min(...times) : 0;
  const hi = times.length ? Math.max(...times) : 1;
  const pad = Math.max(200, (hi - lo) * 0.08);
  const x = scaleLinear()
    .domain([1, model.totalLaps])
    .range([M.left, Math.max(M.left + 100, width - M.right)]);
  const y = scaleLinear()
    .domain([lo - pad, hi + pad])
    .range([HEIGHT - M.bottom, M.top]);
  const path = line<{ lap: number; durationMs: number }>()
    .x((l) => x(l.lap))
    .y((l) => y(l.durationMs));

  return (
    <div ref={ref} className="w-full" data-cy="lap-time-chart">
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label="Clean lap times by lap for the shown drivers">
          {y.ticks(5).map((v) => (
            <g key={v}>
              <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--border)" />
              <text x={M.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular">
                {formatLapTime(v).slice(0, -2)}
              </text>
            </g>
          ))}
          {x.ticks(Math.min(12, Math.floor(width / 70))).map((lap) => (
            <text key={lap} x={x(lap)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--muted)" className="tabular">
              {lap}
            </text>
          ))}
          {series.map((s) => {
            const colour = hex(model.drivers.get(s.driver)?.colour);
            return (
              <g key={s.driver} data-cy={`pace-series-${s.driver}`}>
                <path
                  d={path(s.laps) ?? ""}
                  fill="none"
                  stroke={colour}
                  strokeWidth={1.5}
                  strokeDasharray={model.secondary.has(s.driver) ? "6 4" : undefined}
                  opacity={0.7}
                />
                {s.laps.map((l) => (
                  <circle key={l.lap} cx={x(l.lap)} cy={y(l.durationMs)} r={2.5} fill={colour}>
                    <title>{`${model.drivers.get(s.driver)?.acronym} · Lap ${l.lap}: ${formatLapTime(l.durationMs)}`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
