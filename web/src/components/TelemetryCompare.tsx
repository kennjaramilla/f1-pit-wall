"use client";

import { scaleLinear } from "d3-scale";
import { curveStepAfter, line } from "d3-shape";
import { useState } from "react";
import { formatLapTime, hex } from "@/lib/format";
import type { RaceModel } from "@/lib/race";
import { errorMessage, useTelemetryDriversQuery, useTelemetryQuery } from "@/store/f1Api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { driverPicked } from "@/store/telemetrySlice";
import { boundsOf, outlinePath, projectionFor } from "@/lib/replay";
import type { Telemetry, TelemetryPoint } from "@/lib/types";
import { useSize } from "@/lib/useSize";
import { EmptyState, ErrorState, Skeleton } from "./ui";

const M = { left: 44, right: 12 };
const CHARTS = [
  { key: "speed", label: "Speed", unit: "km/h", height: 150 },
  { key: "throttle", label: "Throttle", unit: "%", height: 80 },
  { key: "brake", label: "Brake", unit: "", height: 44 },
  { key: "gear", label: "Gear", unit: "", height: 70 },
] as const;

type ChartKey = (typeof CHARTS)[number]["key"];

function value(p: TelemetryPoint, key: ChartKey): number {
  if (key === "brake") return p.brake ? 1 : 0;
  return p[key];
}

/** Nearest sample at a given distance (points are sorted by distance). */
export function sampleAt(points: TelemetryPoint[], d: number): TelemetryPoint | null {
  if (points.length === 0) return null;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].d <= d) lo = mid;
    else hi = mid;
  }
  return Math.abs(points[lo].d - d) <= Math.abs(points[hi].d - d) ? points[lo] : points[hi];
}

export function TelemetryCompare({ model }: { model: RaceModel }) {
  const available = useTelemetryDriversQuery(model.bundle.race.sessionKey);
  const picks = useAppSelector((s) => s.telemetry.picks);
  const dispatch = useAppDispatch();

  if (available.isError)
    return <ErrorState title="Telemetry unavailable" message={errorMessage(available.error)} onRetry={() => available.refetch()} />;
  if (!available.data) return <Skeleton className="m-4 h-80" />;

  // Default comparison: the race's fastest lap against the next best classified driver.
  const ranked = model.order.filter((d) => available.data.includes(d));
  const a = picks[0] ?? model.bundle.fastestLaps[0]?.driver ?? ranked[0];
  const b = picks[1] ?? ranked.find((d) => d !== a);
  if (a == null || b == null) return <EmptyState>Not enough telemetry cached for this race.</EmptyState>;

  const select = (slot: 0 | 1, value: number, other: number) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Driver {slot === 0 ? "A" : "B"}</span>
      <select
        value={value}
        onChange={(e) => dispatch(driverPicked({ slot, driver: Number(e.target.value) }))}
        className="rounded-md border border-border bg-panel-2 px-2 py-1.5 text-text"
        data-cy={`telemetry-driver-${slot}`}
      >
        {ranked.map((d) => (
          <option key={d} value={d} disabled={d === other}>
            {model.drivers.get(d)?.acronym} · {model.drivers.get(d)?.fullName}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="px-4 pb-4" data-cy="telemetry">
      <div className="flex flex-wrap items-center gap-4 py-3">
        {select(0, a, b)}
        {select(1, b, a)}
        <span className="text-xs text-muted">Fastest race lap of each driver, aligned by distance.</span>
      </div>
      <TelemetryPair model={model} a={a} b={b} />
    </div>
  );
}

function TelemetryPair({ model, a, b }: { model: RaceModel; a: number; b: number }) {
  const key = model.bundle.race.sessionKey;
  const lapA = useTelemetryQuery({ key, driver: a });
  const lapB = useTelemetryQuery({ key, driver: b });
  const error = lapA.error ?? lapB.error;
  if (error)
    return (
      <ErrorState
        title="Couldn't load telemetry"
        message={errorMessage(error)}
        onRetry={() => {
          lapA.refetch();
          lapB.refetch();
        }}
      />
    );
  if (!lapA.data || !lapB.data) return <Skeleton className="h-80" />;
  return <TelemetryCharts model={model} laps={[lapA.data, lapB.data]} />;
}

function TelemetryCharts({ model, laps }: { model: RaceModel; laps: Telemetry[] }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [hoverD, setHoverD] = useState<number | null>(null);
  const maxD = Math.max(...laps.map((l) => l.points.at(-1)?.d ?? 0));
  const x = scaleLinear()
    .domain([0, maxD])
    .range([M.left, Math.max(M.left + 100, width - M.right)]);
  const fastest = model.bundle.fastestLaps[0];
  const colours = laps.map((l) => hex(model.drivers.get(l.driver)?.colour));
  // Same team colour? dash driver B so the lines stay distinguishable.
  const dashB = colours[0] === colours[1];
  const delta = laps[1].lapTimeMs - laps[0].lapTimeMs;
  const outline = model.bundle.race.outline;

  const onMove = (e: React.PointerEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverD(Math.max(0, Math.min(maxD, x.invert(e.clientX - rect.left))));
  };

  const hoverSamples = hoverD == null ? null : laps.map((l) => sampleAt(l.points, hoverD));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div ref={ref} className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-4 text-sm">
          {laps.map((l, i) => {
            const d = model.drivers.get(l.driver);
            const isFastest = fastest && fastest.driver === l.driver && fastest.lap === l.lap;
            return (
              <div key={l.driver} className="flex items-center gap-2">
                <svg width="28" height="8" aria-hidden>
                  <line
                    x1="0"
                    x2="28"
                    y1="4"
                    y2="4"
                    stroke={colours[i]}
                    strokeWidth="3"
                    strokeDasharray={i === 1 && dashB ? "6 4" : undefined}
                  />
                </svg>
                <span className="font-bold">{d?.acronym}</span>
                <span className="tabular font-mono">{formatLapTime(l.lapTimeMs)}</span>
                <span className="text-xs text-muted">lap {l.lap}</span>
                {isFastest && <span className="rounded bg-purple/20 px-1.5 py-0.5 text-[11px] font-semibold text-purple">Fastest lap</span>}
              </div>
            );
          })}
          <span className="tabular text-muted">
            Δ <span className="font-mono text-text">{(delta / 1000).toFixed(3)}s</span>
          </span>
        </div>
        {width > 0 &&
          CHARTS.map((c) => {
            const vals = laps.flatMap((l) => l.points.map((p) => value(p, c.key)));
            const y = scaleLinear()
              .domain(
                c.key === "brake"
                  ? [0, 1]
                  : c.key === "throttle"
                    ? [0, 100]
                    : [Math.min(...vals) * (c.key === "speed" ? 0.9 : 1), Math.max(...vals)],
              )
              .range([c.height - 6, 6]);
            const gen = line<TelemetryPoint>()
              .x((p) => x(p.d))
              .y((p) => y(value(p, c.key)));
            if (c.key === "brake" || c.key === "gear") gen.curve(curveStepAfter);
            return (
              <div key={c.key} className="border-t border-border first:border-t-0">
                <svg
                  width={width}
                  height={c.height}
                  role="img"
                  aria-label={`${c.label} trace by distance`}
                  onPointerMove={onMove}
                  onPointerLeave={() => setHoverD(null)}
                >
                  <text x={4} y={14} fontSize={11} fill="var(--muted)" fontWeight={600}>
                    {c.label}
                  </text>
                  {c.key === "speed" &&
                    y.ticks(3).map((v) => (
                      <g key={v}>
                        <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--border)" />
                        <text x={M.left - 6} y={y(v) + 4} fontSize={10} textAnchor="end" fill="var(--faint)" className="tabular">
                          {v}
                        </text>
                      </g>
                    ))}
                  {laps.map((l, i) => (
                    <path
                      key={l.driver}
                      d={gen(l.points) ?? ""}
                      fill="none"
                      stroke={colours[i]}
                      strokeWidth={c.key === "speed" ? 2 : 1.5}
                      strokeDasharray={i === 1 && dashB ? "6 4" : undefined}
                      opacity={i === 1 ? 0.9 : 1}
                    />
                  ))}
                  {hoverD != null && <line x1={x(hoverD)} x2={x(hoverD)} y1={0} y2={c.height} stroke="var(--text)" strokeOpacity={0.5} />}
                </svg>
              </div>
            );
          })}
        {width > 0 && (
          <div className="flex justify-between pl-11 pr-3 text-[10px] text-faint tabular">
            <span>0 m</span>
            <span>{Math.round(maxD / 2)} m</span>
            <span>{Math.round(maxD)} m</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <MiniMap outline={outline} samples={hoverSamples} colours={colours} />
        <div className="rounded-lg border border-border bg-panel-2 p-3 text-xs" aria-live="polite">
          {hoverSamples ? (
            <table className="tabular w-full">
              <thead>
                <tr className="text-muted">
                  <th className="text-left font-normal">@ {Math.round(hoverD ?? 0)} m</th>
                  {laps.map((l, i) => (
                    <th key={l.driver} className="text-right font-semibold" style={{ color: colours[i] }}>
                      {model.drivers.get(l.driver)?.acronym}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-mono">
                {(["speed", "throttle", "gear"] as const).map((k) => (
                  <tr key={k}>
                    <td className="font-sans text-muted capitalize">{k}</td>
                    {hoverSamples.map((s, i) => (
                      <td key={i} className="text-right">
                        {s ? s[k] : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="font-sans text-muted">Brake</td>
                  {hoverSamples.map((s, i) => (
                    <td key={i} className="text-right">
                      {s?.brake ? "ON" : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-muted">Hover the traces to compare both cars at the same point on track.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniMap({ outline, samples, colours }: { outline: number[][]; samples: (TelemetryPoint | null)[] | null; colours: string[] }) {
  if (outline.length < 3) return null;
  const project = projectionFor(outline);
  const b = boundsOf(outline, 0.1, project);
  const size = Math.max(b.maxX - b.minX, b.maxY - b.minY);
  return (
    <svg
      viewBox={`${b.minX} ${b.minY} ${b.maxX - b.minX} ${b.maxY - b.minY}`}
      className="aspect-[4/3] w-full rounded-lg border border-border bg-bg/60"
      role="img"
      aria-label="Position on track"
    >
      <path d={outlinePath(outline, project)} fill="none" stroke="var(--border-strong)" strokeWidth={size / 50} strokeLinejoin="round" />
      {samples?.map((s, i) =>
        s && s.x != null && s.y != null ? (
          <circle
            key={i}
            cx={project(s.x, s.y)[0]}
            cy={project(s.x, s.y)[1]}
            r={size / 35}
            fill={colours[i]}
            stroke="var(--bg)"
            strokeWidth={size / 120}
          />
        ) : null,
      )}
    </svg>
  );
}
