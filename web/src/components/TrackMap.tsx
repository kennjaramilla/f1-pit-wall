"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { hex } from "@/lib/format";
import type { RaceModel } from "@/lib/race";
import { boundsOf, carPosition, outlinePath, projectionFor } from "@/lib/replay";
import { useReplayClock } from "@/lib/replayClock";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { driverToggled } from "@/store/replaySlice";
import { selectSelected } from "@/store/selectors";
import type { Replay } from "@/lib/types";

/** Track map. Car markers follow the animation clock directly, so React doesn't re-render at 60 fps. */
export function TrackMap({ replay, model }: { replay: Replay; model: RaceModel }) {
  const selected = useAppSelector(selectSelected);
  const dispatch = useAppDispatch();
  const clock = useReplayClock();
  const markers = useRef(new Map<number, SVGGElement>());

  const project = useMemo(() => projectionFor(replay.outline), [replay.outline]);
  const bounds = useMemo(() => boundsOf(replay.outline, 0.08, project), [replay.outline, project]);
  const path = useMemo(() => outlinePath(replay.outline, project), [replay.outline, project]);
  const r = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 95;
  const finishLine = replay.outline[0] ? project(replay.outline[0][0], replay.outline[0][1]) : null;

  // Selected cars render last so they sit on top.
  const drivers = useMemo(
    () => [...replay.drivers].sort((a, b) => Number(selected.has(a.driver)) - Number(selected.has(b.driver))),
    [replay.drivers, selected],
  );

  useLayoutEffect(() => {
    const draw = (t: number) => {
      for (const d of replay.drivers) {
        const el = markers.current.get(d.driver);
        if (!el) continue;
        const p = carPosition(replay, d.xy, t);
        el.style.display = p ? "" : "none";
        if (!p) continue;
        const [x, y] = project(p[0], p[1]);
        el.setAttribute("transform", `translate(${x.toFixed(0)} ${y.toFixed(0)})`);
      }
    };
    draw(clock.t);
    return clock.subscribe(draw);
  }, [clock, replay, project, drivers]);

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`}
      className="h-full w-full select-none"
      role="img"
      aria-label={`Track map of ${model.bundle.race.circuit} with live car positions`}
      data-cy="track-map"
    >
      <path d={path} fill="none" stroke="var(--panel-3)" strokeWidth={r * 2.6} strokeLinejoin="round" />
      <path d={path} fill="none" stroke="var(--border-strong)" strokeWidth={r * 0.35} strokeLinejoin="round" />
      {finishLine && (
        <rect x={finishLine[0] - r * 0.4} y={finishLine[1] - r * 1.6} width={r * 0.8} height={r * 3.2} fill="var(--text)" aria-hidden />
      )}
      {drivers.map((d) => {
        const info = model.drivers.get(d.driver);
        const isSelected = selected.has(d.driver);
        return (
          <g
            key={d.driver}
            ref={(el) => {
              if (el) markers.current.set(d.driver, el);
              else markers.current.delete(d.driver);
            }}
            onClick={() => dispatch(driverToggled(d.driver))}
            style={{ cursor: "pointer", opacity: selected.size > 0 && !isSelected ? 0.35 : 1 }}
            data-cy={`car-${d.driver}`}
          >
            <title>{info?.fullName ?? String(d.driver)}</title>
            {isSelected && <circle r={r * 1.9} fill="none" stroke="var(--text)" strokeWidth={r * 0.3} />}
            <circle
              r={isSelected ? r * 1.3 : r}
              fill={hex(info?.colour)}
              stroke={model.secondary.has(d.driver) ? "var(--text)" : "var(--bg)"}
              strokeWidth={r * 0.35}
            />
            <text
              x={r * 1.6}
              y={r * 0.5}
              fontSize={isSelected ? r * 2 : r * 1.45}
              fontWeight={700}
              fill="var(--text)"
              stroke="var(--bg)"
              strokeWidth={r * 0.5}
              paintOrder="stroke"
            >
              {info?.acronym ?? d.driver}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
