"use client";

import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useMemo, useState } from "react";
import { formatGap, hex } from "@/lib/format";
import { currentLap, type RaceModel } from "@/lib/race";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { driverToggled } from "@/store/replaySlice";
import { selectCurrentLap, selectSelected } from "@/store/selectors";
import { useSize } from "@/lib/useSize";

const M = { top: 12, right: 52, bottom: 28, left: 44 };
const HEIGHT = 380;
const CAPS = [15, 30, 60, 120] as const;

/** Gap to leader per lap. Leader on top, teammates distinguished by dash, hover isolates one car. */
export function GapChart({ model }: { model: RaceModel }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const [cap, setCap] = useState<number>(60);
  const [hover, setHover] = useState<{ driver: number; lap: number } | null>(null);
  const selected = useAppSelector(selectSelected);
  const dispatch = useAppDispatch();
  const toggleDriver = (d: number) => dispatch(driverToggled(d));
  const nowLap = useAppSelector(selectCurrentLap);

  const x = scaleLinear()
    .domain([1, model.totalLaps])
    .range([M.left, Math.max(M.left + 100, width - M.right)]);
  const y = scaleLinear()
    .domain([0, cap])
    .range([M.top, HEIGHT - M.bottom])
    .clamp(true);

  const series = useMemo(
    () =>
      model.bundle.gaps
        .filter((g) => g.gaps.some((v) => v != null))
        .sort((a, b) => model.order.indexOf(a.driver) - model.order.indexOf(b.driver)),
    [model],
  );
  const path = line<number | null>()
    .defined((v) => v != null)
    .x((_, i) => x(i + 1))
    .y((v) => y(v ?? 0));

  // Period bands in lap units.
  const bands = model.bundle.periods.map((p) => ({ kind: p.kind, from: currentLap(model, p.startMs), to: currentLap(model, p.endMs) }));
  const focus = hover?.driver ?? null;
  const highlighted = (d: number) => (focus != null ? d === focus : selected.size === 0 || selected.has(d));

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left + M.left;
    const py = e.clientY - rect.top + M.top;
    const lap = Math.round(x.invert(px));
    if (lap < 1 || lap > model.totalLaps) return setHover(null);
    let best: { driver: number; dist: number } | null = null;
    for (const s of series) {
      const v = s.gaps[lap - 1];
      if (v == null) continue;
      const dist = Math.abs(y(v) - py);
      if (!best || dist < best.dist) best = { driver: s.driver, dist };
    }
    setHover(best && best.dist < 24 ? { driver: best.driver, lap } : null);
  };

  const hoverValue = hover ? series.find((s) => s.driver === hover.driver)?.gaps[hover.lap - 1] : null;
  const hoverInfo = hover ? model.drivers.get(hover.driver) : null;
  const yTicks = y.ticks(6);

  return (
    <div className="px-4 pb-4" data-cy="gap-chart">
      <div className="flex flex-wrap items-center gap-3 py-3 text-xs text-muted">
        <span>Seconds behind the leader at the end of each lap. Hover a line to isolate it; click to pin.</span>
        <label className="ml-auto flex items-center gap-2">
          Show up to
          <select
            value={cap}
            onChange={(e) => setCap(Number(e.target.value))}
            className="rounded-md border border-border bg-panel-2 px-2 py-1 text-text"
          >
            {CAPS.map((c) => (
              <option key={c} value={c}>
                {c}s
              </option>
            ))}
          </select>
        </label>
      </div>
      <div ref={ref} className="relative w-full">
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label="Gap to leader by lap for every driver">
            {bands.map((b, i) => (
              <rect
                key={i}
                x={x(b.from)}
                width={Math.max(2, x(b.to) - x(b.from))}
                y={M.top}
                height={HEIGHT - M.top - M.bottom}
                fill={b.kind === "red" ? "var(--flag-red)" : b.kind === "vsc" ? "var(--flag-vsc)" : "var(--flag-sc)"}
                opacity={0.12}
              />
            ))}
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={M.left} x2={width - M.right} y1={y(v)} y2={y(v)} stroke="var(--border)" />
                <text x={M.left - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)" className="tabular">
                  {v === 0 ? "0" : `+${v}s`}
                </text>
              </g>
            ))}
            {x.ticks(Math.min(12, Math.floor(width / 70))).map((lap) => (
              <text key={lap} x={x(lap)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="var(--muted)" className="tabular">
                {lap}
              </text>
            ))}
            <line
              x1={x(nowLap)}
              x2={x(nowLap)}
              y1={M.top}
              y2={HEIGHT - M.bottom}
              stroke="var(--text)"
              strokeWidth={1.5}
              strokeDasharray="2 3"
            />
            {series.map((s) => {
              const info = model.drivers.get(s.driver);
              const on = highlighted(s.driver);
              return (
                <path
                  key={s.driver}
                  d={path(s.gaps) ?? ""}
                  fill="none"
                  stroke={hex(info?.colour)}
                  strokeWidth={on && (focus != null || selected.size > 0) ? 3 : 1.75}
                  strokeDasharray={model.secondary.has(s.driver) ? "6 4" : undefined}
                  opacity={on ? 1 : 0.15}
                  data-cy={`gap-line-${s.driver}`}
                />
              );
            })}
            {series.map((s) => {
              const last = s.gaps.findLastIndex((v) => v != null);
              const v = s.gaps[last];
              if (last < 0 || v == null || v > cap || !highlighted(s.driver)) return null;
              return (
                <text
                  key={s.driver}
                  x={x(last + 1) + 6}
                  y={y(v) + 4}
                  fontSize={11}
                  fontWeight={700}
                  fill={hex(model.drivers.get(s.driver)?.colour)}
                >
                  {model.drivers.get(s.driver)?.acronym}
                </text>
              );
            })}
            {hover && hoverValue != null && (
              <circle cx={x(hover.lap)} cy={y(hoverValue)} r={5} fill={hex(hoverInfo?.colour)} stroke="var(--bg)" strokeWidth={2} />
            )}
            <rect
              x={M.left}
              y={M.top}
              width={Math.max(0, width - M.left - M.right)}
              height={HEIGHT - M.top - M.bottom}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              onClick={() => hover && toggleDriver(hover.driver)}
              style={{ cursor: hover ? "pointer" : "crosshair" }}
            />
          </svg>
        )}
        {hover && hoverValue != null && hoverInfo && (
          <div
            role="status"
            className="pointer-events-none absolute rounded-md border border-border-strong bg-panel-2 px-3 py-2 text-xs shadow-lg"
            style={{ left: Math.min(x(hover.lap) + 12, width - 170), top: Math.max(0, y(hoverValue) - 50) }}
          >
            <div className="flex items-center gap-2 font-semibold">
              <span aria-hidden className="h-3 w-1 rounded-sm" style={{ background: hex(hoverInfo.colour) }} />
              {hoverInfo.fullName}
            </div>
            <div className="tabular mt-0.5 text-muted">
              Lap {hover.lap} · <span className="font-mono text-text">{formatGap(hoverValue)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
