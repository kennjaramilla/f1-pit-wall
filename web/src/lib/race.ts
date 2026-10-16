import { frontAt, gapToFront, progressOf, type ProgressModel } from "./progress";
import type { Driver, Period, RaceBundle, RaceEvent, Stint } from "./types";

/** Precomputed lookups so per-frame selectors stay cheap. */
export interface RaceModel {
  bundle: RaceBundle;
  totalLaps: number;
  drivers: Map<number, Driver>;
  /** Sorted line-crossing times per driver; index = lap - 1. */
  crossings: Map<number, number[]>;
  /** First car across the line at the end of each lap; index = lap - 1. */
  leaderCross: number[];
  /** Final classification order of driver numbers. */
  order: number[];
  /** true when the second car of a team should be drawn dashed. */
  secondary: Set<number>;
  stints: Map<number, Stint[]>;
  positions: Map<number, { t: number; position: number }[]>;
  finishMs: number;
}

export function lapCrossings(laps: { lap: number; t: number | null; durationMs: number | null }[]): number[] {
  const sorted = [...laps].sort((a, b) => a.lap - b.lap);
  const out: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const l = sorted[i];
    const next = sorted[i + 1];
    const end = next && next.lap === l.lap + 1 && next.t != null ? next.t : l.t != null && l.durationMs != null ? l.t + l.durationMs : null;
    if (end == null) break;
    out[l.lap - 1] = end;
  }
  // Keep the array dense: stop at the first missing lap.
  const dense: number[] = [];
  for (let i = 0; i < out.length && out[i] != null; i++) dense.push(out[i]);
  return dense;
}

export function buildRaceModel(bundle: RaceBundle): RaceModel {
  const totalLaps = bundle.race.totalLaps;
  const drivers = new Map(bundle.drivers.map((d) => [d.number, d]));

  const lapsByDriver = new Map<number, RaceBundle["laps"]>();
  for (const l of bundle.laps) {
    const arr = lapsByDriver.get(l.driver) ?? [];
    arr.push(l);
    lapsByDriver.set(l.driver, arr);
  }
  const crossings = new Map<number, number[]>();
  for (const [d, laps] of lapsByDriver) crossings.set(d, lapCrossings(laps));

  const leaderCross: number[] = [];
  for (let lap = 0; lap < totalLaps; lap++) {
    let min = Infinity;
    for (const c of crossings.values()) if (c[lap] != null && c[lap] < min) min = c[lap];
    if (min === Infinity) break;
    leaderCross.push(min);
  }

  const order = bundle.classification.map((c) => c.driver);
  for (const d of bundle.drivers) if (!order.includes(d.number)) order.push(d.number);

  // Teammates share a colour; dash the lower-classified one.
  const secondary = new Set<number>();
  const seenTeams = new Set<string>();
  for (const n of order) {
    const team = drivers.get(n)?.team ?? String(n);
    if (seenTeams.has(team)) secondary.add(n);
    else seenTeams.add(team);
  }

  const stints = new Map<number, Stint[]>();
  for (const s of bundle.stints) {
    const arr = stints.get(s.driver) ?? [];
    arr.push(s);
    stints.set(s.driver, arr);
  }

  const positions = new Map<number, { t: number; position: number }[]>();
  for (const p of bundle.positions) {
    const arr = positions.get(p.driver) ?? [];
    arr.push({ t: p.t, position: p.position });
    positions.set(p.driver, arr);
  }
  for (const arr of positions.values()) arr.sort((a, b) => a.t - b.t);

  return {
    bundle,
    totalLaps,
    drivers,
    crossings,
    leaderCross,
    order,
    secondary,
    stints,
    positions,
    finishMs: leaderCross[totalLaps - 1] ?? bundle.windowEndMs,
  };
}

/** Number of items in an ascending array that are <= t. */
export function countUpTo(sorted: number[], t: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= t) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Lap the leader is on at time t (1-based, clamped to the race distance). */
export function currentLap(model: RaceModel, t: number): number {
  return Math.min(model.totalLaps, Math.max(1, countUpTo(model.leaderCross, t) + 1));
}

export interface GapInfo {
  lapsCompleted: number;
  /** Laps completed plus the time-based fraction of the current lap. */
  progress: number;
  gapSec: number | null;
  lapsDown: number;
}

/** Fraction-of-lap progress at time t, interpolating between line crossings (race start = 0). */
export function progressAt(crossings: number[], t: number): { done: number; progress: number } {
  const done = countUpTo(crossings, t);
  const prev = done === 0 ? 0 : crossings[done - 1];
  const next = crossings[done];
  if (next == null || t <= 0) return { done, progress: done };
  return { done, progress: done + Math.min(1, Math.max(0, (t - prev) / (next - prev))) };
}

/** When the lead car reached a given progress value (inverse of progressAt on the leader's crossings). */
function leaderTimeAt(leaderCross: number[], progress: number): number {
  const k = Math.floor(progress);
  const f = progress - k;
  const at = (i: number) => (i === 0 ? 0 : leaderCross[i - 1]);
  if (k >= leaderCross.length) return leaderCross[leaderCross.length - 1] ?? 0;
  return at(k) + f * (at(k + 1) - at(k));
}

/**
 * Gap to the leader at time t, updated continuously rather than only at the line:
 * how long ago the lead car was where this car is now.
 */
export function gapAt(model: RaceModel, driver: number, t: number, pm?: ProgressModel | null): GapInfo {
  const c = model.crossings.get(driver) ?? [];
  const { done, progress } = progressAt(c, t);
  if (t <= 0) return { lapsCompleted: 0, progress: 0, gapSec: null, lapsDown: 0 };
  const finished = done >= model.totalLaps;
  // Prefer GPS-based progress (accurate through pit stops); fall back to timing-only interpolation.
  const geo = pm && !finished ? progressOf(pm, driver, t) : NaN;
  if (Number.isFinite(geo) && pm) {
    const frontNow = frontAt(pm, t);
    return {
      lapsCompleted: done,
      progress: geo,
      gapSec: Math.round(gapToFront(pm, geo, t) * 1000) / 1000,
      lapsDown: Math.max(0, Math.floor(frontNow - geo)),
    };
  }
  const leaderProgress = progressAt(model.leaderCross, t).progress;
  const lapsDown = Math.max(0, Math.floor(leaderProgress - progress));
  // Finished (or retired) cars keep the gap they had at their last line crossing.
  const finalGap = done > 0 && (done >= model.totalLaps || c[done] == null) ? (c[done - 1] - model.leaderCross[done - 1]) / 1000 : null;
  const gapSec = finalGap ?? (t - leaderTimeAt(model.leaderCross, progress)) / 1000;
  return { lapsCompleted: done, progress, gapSec: Math.max(0, Math.round(gapSec * 1000) / 1000), lapsDown };
}

export function positionAt(model: RaceModel, driver: number, t: number): number | null {
  const arr = model.positions.get(driver);
  if (!arr || arr.length === 0) return null;
  let pos = arr[0].position;
  for (const p of arr) {
    if (p.t > t) break;
    pos = p.position;
  }
  return pos;
}

export function stintAt(model: RaceModel, driver: number, lap: number): { stint: Stint; age: number } | null {
  const stints = model.stints.get(driver);
  if (!stints || stints.length === 0) return null;
  const s = stints.find((x) => lap >= x.lapStart && lap <= x.lapEnd) ?? (lap < stints[0].lapStart ? stints[0] : stints[stints.length - 1]);
  return { stint: s, age: s.tyreAgeAtStart + Math.max(0, Math.min(lap, s.lapEnd) - s.lapStart) };
}

export function pitStatusAt(model: RaceModel, driver: number, t: number): { stops: number; inPit: boolean } {
  let stops = 0;
  let inPit = false;
  for (const p of model.bundle.pits) {
    if (p.driver !== driver || p.t > t) continue;
    stops++;
    // OpenF1 stamps the pit entry; the lane time tells us when the car rejoins.
    if (t - p.t < (p.laneDuration ?? 22) * 1000) inPit = true;
  }
  return { stops, inPit };
}

export function periodAt(periods: Period[], t: number): Period | null {
  return periods.find((p) => t >= p.startMs && t < p.endMs) ?? null;
}

export function recentEvents(events: RaceEvent[], t: number, n = 5): RaceEvent[] {
  const upTo = events.filter((e) => e.t <= t);
  return upTo.slice(-n).reverse();
}

export interface LeaderboardRow {
  driver: Driver;
  position: number;
  gap: GapInfo;
  compound: string | null;
  tyreAge: number | null;
  stops: number;
  inPit: boolean;
  retired: boolean;
  secondary: boolean;
}

export function leaderboardAt(model: RaceModel, t: number, pm?: ProgressModel | null): LeaderboardRow[] {
  const rows: LeaderboardRow[] = [];
  for (const [n, driver] of model.drivers) {
    const c = model.crossings.get(n) ?? [];
    const lastCross = c.length ? c[c.length - 1] : 0;
    const classified = model.bundle.classification.find((x) => x.driver === n);
    // Retired cars stop crossing the line; flag them once they're well overdue.
    const retired = classified?.status === "DNF" && t > lastCross + 150_000;
    const gap = gapAt(model, n, t, pm);
    const tyre = stintAt(model, n, Math.min(model.totalLaps, gap.lapsCompleted + 1));
    const pit = pitStatusAt(model, n, t);
    rows.push({
      driver,
      position: positionAt(model, n, t) ?? 99,
      gap,
      compound: tyre?.stint.compound ?? null,
      tyreAge: tyre?.age ?? null,
      stops: pit.stops,
      inPit: pit.inPit && !retired,
      retired,
      secondary: model.secondary.has(n),
    });
  }
  rows.sort((a, b) => Number(a.retired) - Number(b.retired) || a.position - b.position);
  return rows.map((r, i) => ({ ...r, position: i + 1, gap: i === 0 && !r.retired ? { ...r.gap, gapSec: 0, lapsDown: 0 } : r.gap }));
}
