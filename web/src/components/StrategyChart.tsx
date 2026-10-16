"use client";

import { scaleLinear } from "d3-scale";
import { COMPOUND_ORDER, compound } from "@/lib/compounds";
import { hex } from "@/lib/format";
import type { RaceModel } from "@/lib/race";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { driverToggled } from "@/store/replaySlice";
import { selectCurrentLap, selectSelected } from "@/store/selectors";
import { useSize } from "@/lib/useSize";

const ROW = 24;
const LEFT = 64;
const TOP = 22;

export function StrategyChart({ model }: { model: RaceModel }) {
  const [ref, { width }] = useSize<HTMLDivElement>();
  const selected = useAppSelector(selectSelected);
  const dispatch = useAppDispatch();
  const toggleDriver = (d: number) => dispatch(driverToggled(d));
  const lap = useAppSelector(selectCurrentLap);
  const order = model.order.filter((d) => model.stints.has(d));
  const height = TOP + order.length * ROW + 8;
  const x = scaleLinear()
    .domain([0, model.totalLaps])
    .range([LEFT, Math.max(LEFT + 100, width - 12)]);
  const ticks = x.ticks(Math.min(12, Math.floor(width / 70)));
  const anySelected = selected.size > 0;
  const used = COMPOUND_ORDER.filter((c) => model.bundle.stints.some((s) => s.compound === c));

  return (
    <div className="px-4 pb-4" data-cy="strategy-chart">
      <ul className="flex flex-wrap gap-4 py-3 text-xs text-muted" aria-label="Tyre compounds">
        {used.map((c) => {
          const s = compound(c);
          return (
            <li key={c} className="flex items-center gap-1.5">
              <span
                className="inline-flex h-4 w-6 items-center justify-center rounded-sm text-[10px] font-bold"
                style={{ background: s.colour, color: s.ink }}
              >
                {s.letter}
              </span>
              {s.label}
            </li>
          );
        })}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-4 w-0.5 bg-text" /> Current lap
        </li>
      </ul>
      <div ref={ref} className="w-full overflow-x-auto">
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Tyre strategy: stints per driver by lap and compound">
            {ticks.map((tick) => (
              <g key={tick}>
                <line x1={x(tick)} x2={x(tick)} y1={TOP - 4} y2={height - 8} stroke="var(--border)" />
                <text x={x(tick)} y={12} textAnchor="middle" fontSize={11} fill="var(--muted)" className="tabular">
                  {tick === 0 ? "Lap" : tick}
                </text>
              </g>
            ))}
            {order.map((d, row) => {
              const info = model.drivers.get(d);
              const y = TOP + row * ROW;
              const dim = anySelected && !selected.has(d);
              return (
                <g key={d} opacity={dim ? 0.35 : 1} onClick={() => toggleDriver(d)} style={{ cursor: "pointer" }}>
                  <rect x={0} y={y} width={LEFT - 10} height={ROW - 4} fill="transparent" />
                  <rect x={2} y={y + 4} width={3} height={ROW - 12} fill={hex(info?.colour)} />
                  <text x={10} y={y + ROW / 2 + 2} fontSize={12} fontWeight={700} fill="var(--text)">
                    {info?.acronym ?? d}
                  </text>
                  {(model.stints.get(d) ?? []).map((s) => {
                    const c = compound(s.compound);
                    const x0 = x(s.lapStart - 1);
                    const w = Math.max(2, x(s.lapEnd) - x0 - 1.5);
                    return (
                      <g key={s.stint}>
                        <rect x={x0} y={y + 2} width={w} height={ROW - 8} rx={3} fill={c.colour} opacity={0.9}>
                          <title>
                            {`${info?.acronym ?? d} · Stint ${s.stint}: ${c.label}, laps ${s.lapStart}–${s.lapEnd} (${s.lapEnd - s.lapStart + 1} laps${
                              s.tyreAgeAtStart > 0 ? `, ${s.tyreAgeAtStart} laps old at start` : ", new set"
                            })`}
                          </title>
                        </rect>
                        {w > 18 && (
                          <text x={x0 + 6} y={y + ROW / 2 + 1} fontSize={10} fontWeight={700} fill={c.ink} pointerEvents="none">
                            {c.letter}
                            {w > 60 ? ` ${s.lapEnd - s.lapStart + 1}` : ""}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}
            <line x1={x(lap)} x2={x(lap)} y1={TOP - 6} y2={height - 6} stroke="var(--text)" strokeWidth={2} />
          </svg>
        )}
      </div>
    </div>
  );
}
