"use client";

import { formatRaceClock } from "@/lib/format";
import type { RaceModel } from "@/lib/race";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { SPEEDS, paused, played, seeked, speedChanged } from "@/store/replaySlice";
import { selectCurrentLap, selectReplay } from "@/store/selectors";

const PERIOD_STYLE: Record<string, { colour: string; label: string }> = {
  sc: { colour: "var(--flag-sc)", label: "Safety car" },
  vsc: { colour: "var(--flag-vsc)", label: "Virtual safety car" },
  red: { colour: "var(--flag-red)", label: "Red flag" },
};

export function ReplayControls({ model, onShowHelp }: { model: RaceModel; onShowHelp: () => void }) {
  const { t, playing, speed } = useAppSelector(selectReplay);
  const lap = useAppSelector(selectCurrentLap);
  const dispatch = useAppDispatch();
  const seek = (ms: number) => dispatch(seeked(ms));
  const { windowStartMs: min, windowEndMs: max, lapStarts, periods } = model.bundle;
  const pct = (ms: number) => ((ms - min) / (max - min)) * 100;
  const lapTicks = lapStarts.filter((l) => l.lap === 1 || l.lap % 5 === 0);

  const jumpLap = (delta: number) => {
    const target = lapStarts.find((l) => l.lap === Math.min(model.totalLaps, Math.max(1, lap + delta)));
    if (target) seek(target.t);
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-3" data-cy="replay-controls">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => dispatch(playing ? paused() : played())}
          aria-label={playing ? "Pause replay" : "Play replay"}
          data-cy="play-toggle"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow hover:brightness-110"
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M7 5v14l12-7z" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => jumpLap(-1)}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-panel-2"
          aria-label="Previous lap"
        >
          ‹ Lap
        </button>
        <button
          type="button"
          onClick={() => jumpLap(1)}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-panel-2"
          aria-label="Next lap"
        >
          Lap ›
        </button>
        <div role="group" aria-label="Playback speed" className="ml-1 inline-flex overflow-hidden rounded-md border border-border">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => dispatch(speedChanged(s))}
              aria-pressed={speed === s}
              data-cy={`speed-${s}`}
              className={`tabular px-2.5 py-1.5 text-xs font-semibold ${speed === s ? "bg-text text-bg" : "text-muted hover:bg-panel-2 hover:text-text"}`}
            >
              {s}×
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="tabular font-mono text-sm" aria-live="off" data-cy="race-clock">
            <span className="text-muted">Lap </span>
            <span className="font-bold">{lap}</span>
            <span className="text-muted">/{model.totalLaps}</span>
            <span className="ml-3 text-muted">{formatRaceClock(t)}</span>
          </span>
          <button
            type="button"
            onClick={onShowHelp}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm font-bold text-muted hover:bg-panel-2 hover:text-text"
            aria-label="Keyboard shortcuts"
          >
            ?
          </button>
        </div>
      </div>

      <div className="relative">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-panel-3">
          <div className="h-full rounded-full bg-accent/70" style={{ width: `${pct(t)}%` }} />
          {periods.map((p, i) => (
            <div
              key={i}
              className="absolute top-[-3px] h-3 rounded-sm opacity-90"
              style={{
                left: `${pct(p.startMs)}%`,
                width: `${Math.max(0.4, pct(p.endMs) - pct(p.startMs))}%`,
                background: PERIOD_STYLE[p.kind]?.colour,
              }}
              title={PERIOD_STYLE[p.kind]?.label}
            />
          ))}
        </div>
        <input
          type="range"
          className="scrubber relative"
          min={min}
          max={max}
          step={1000}
          value={t}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Replay position"
          aria-valuetext={`Lap ${lap} of ${model.totalLaps}, ${formatRaceClock(t)}`}
          data-cy="scrubber"
        />
      </div>
      <div aria-hidden className="relative h-4 text-[10px] text-muted">
        {lapTicks.map((l) => (
          <span key={l.lap} className="tabular absolute -translate-x-1/2" style={{ left: `${pct(l.t)}%` }}>
            {l.lap === 1 ? "L1" : l.lap}
          </span>
        ))}
      </div>
      {periods.length > 0 && (
        <ul className="flex flex-wrap gap-3 text-xs text-muted" aria-label="Track status periods">
          {[...new Set(periods.map((p) => p.kind))].map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-4 rounded-sm" style={{ background: PERIOD_STYLE[k]?.colour }} />
              {PERIOD_STYLE[k]?.label} ({periods.filter((p) => p.kind === k).length})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
