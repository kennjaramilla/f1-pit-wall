import type { RaceModel } from "./race";
import type { Lap } from "./types";

export type LapExclusion = "lap1" | "pit" | "neutralised" | "missing" | "outlier";

export interface PaceLap {
  lap: number;
  durationMs: number;
}

export interface DriverPace {
  driver: number;
  laps: PaceLap[];
  bestMs: number | null;
  medianMs: number | null;
  /** Standard deviation of clean laps: lower is more consistent. */
  spreadMs: number | null;
  /** Median minus the fastest median in the race. */
  deltaMs: number | null;
  stints: StintPace[];
}

export interface StintPace {
  stint: number;
  compound: string;
  laps: number;
  avgMs: number | null;
  /** Lap time lost per lap of tyre age (least squares); null under 3 clean laps. */
  degMsPerLap: number | null;
}

/** Laps slower than this multiple of the driver's median are traffic, mistakes or damage. */
const OUTLIER_FACTOR = 1.07;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function spread(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1));
}

/** Why a lap says little about pace, or null when it's a clean green-flag lap. */
export function excludeReason(model: RaceModel, lap: Lap): Exclude<LapExclusion, "outlier"> | null {
  if (lap.durationMs == null || lap.t == null) return "missing";
  if (lap.lap === 1) return "lap1";
  if (lap.pitOut || model.bundle.pits.some((p) => p.driver === lap.driver && p.lap === lap.lap)) return "pit";
  const end = lap.t + lap.durationMs;
  if (model.bundle.periods.some((p) => lap.t! < p.endMs && end > p.startMs)) return "neutralised";
  return null;
}

/** Green-flag laps for one driver, without in/out laps, neutralised laps and outliers. */
export function cleanLaps(model: RaceModel, driver: number): PaceLap[] {
  const laps = model.bundle.laps
    .filter((l) => l.driver === driver && excludeReason(model, l) == null)
    .map((l) => ({ lap: l.lap, durationMs: l.durationMs! }))
    .sort((a, b) => a.lap - b.lap);
  const m = median(laps.map((l) => l.durationMs));
  return m == null ? laps : laps.filter((l) => l.durationMs <= m * OUTLIER_FACTOR);
}

/** Least-squares slope of y over x. */
export function slope(points: [number, number][]): number | null {
  if (points.length < 3) return null;
  const n = points.length;
  const mx = points.reduce((a, [x]) => a + x, 0) / n;
  const my = points.reduce((a, [, y]) => a + y, 0) / n;
  const sxx = points.reduce((a, [x]) => a + (x - mx) ** 2, 0);
  if (sxx === 0) return null;
  return points.reduce((a, [x, y]) => a + (x - mx) * (y - my), 0) / sxx;
}

/** Average pace and tyre degradation for each stint, from clean laps only. */
export function stintPace(model: RaceModel, driver: number, laps = cleanLaps(model, driver)): StintPace[] {
  return (model.stints.get(driver) ?? []).map((s) => {
    const inStint = laps.filter((l) => l.lap >= s.lapStart && l.lap <= s.lapEnd);
    const times = inStint.map((l) => l.durationMs);
    return {
      stint: s.stint,
      compound: s.compound,
      laps: inStint.length,
      avgMs: times.length ? times.reduce((a, b) => a + b, 0) / times.length : null,
      degMsPerLap: slope(inStint.map((l) => [s.tyreAgeAtStart + l.lap - s.lapStart, l.durationMs])),
    };
  });
}

/** Pace per driver, fastest median first; drivers without clean laps go last. */
export function racePace(model: RaceModel): DriverPace[] {
  const rows = model.order.map((driver) => {
    const laps = cleanLaps(model, driver);
    const times = laps.map((l) => l.durationMs);
    return {
      driver,
      laps,
      bestMs: times.length ? Math.min(...times) : null,
      medianMs: median(times),
      spreadMs: spread(times),
      deltaMs: null as number | null,
      stints: stintPace(model, driver, laps),
    };
  });
  const fastest = Math.min(...rows.map((r) => r.medianMs ?? Infinity));
  for (const r of rows) r.deltaMs = r.medianMs == null || !Number.isFinite(fastest) ? null : r.medianMs - fastest;
  return rows.sort((a, b) => (a.medianMs ?? Infinity) - (b.medianMs ?? Infinity));
}
