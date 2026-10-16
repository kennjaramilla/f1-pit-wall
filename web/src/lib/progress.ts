import { countUpTo } from "./race";
import type { Replay } from "./types";

/**
 * Race progress (laps completed + geometric fraction of the current lap) for every car on every
 * replay frame, plus the "race front" — how far the lead car had got at each frame. Gaps are then
 * "how long ago was the front where this car is now", which stays correct through pit stops.
 */
export interface ProgressModel {
  startMs: number;
  stepMs: number;
  byDriver: Map<number, Float32Array>;
  front: Float32Array;
}

/** Cumulative fraction (0..1) of lap distance at each outline point. */
export function outlineFractions(outline: number[][]): Float32Array {
  const fr = new Float32Array(outline.length);
  let total = 0;
  for (let i = 1; i < outline.length; i++) {
    total += Math.hypot(outline[i][0] - outline[i - 1][0], outline[i][1] - outline[i - 1][1]);
    fr[i] = total;
  }
  for (let i = 0; i < fr.length; i++) fr[i] = total > 0 ? fr[i] / total : 0;
  return fr;
}

function nearest(outline: number[][], x: number, y: number, hint: number, window: number): number {
  const n = outline.length;
  let best = hint;
  let bestD = Infinity;
  const scan = (from: number, to: number) => {
    for (let k = from; k <= to; k++) {
      const i = ((k % n) + n) % n;
      const d = (outline[i][0] - x) ** 2 + (outline[i][1] - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
  };
  if (hint < 0) scan(0, n - 1);
  else scan(hint - window, hint + window);
  return best;
}

/** Project (x, y) onto the segments either side of vertex i for a continuous lap fraction. */
function segmentFraction(outline: number[][], fr: Float32Array, i: number, x: number, y: number): number {
  const n = outline.length;
  let best = fr[i];
  let bestD = Infinity;
  for (const j of [i - 1, i]) {
    if (j < 0 || j + 1 >= n) continue;
    const [ax, ay] = outline[j];
    const [bx, by] = outline[j + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
    const d = (ax + u * dx - x) ** 2 + (ay + u * dy - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = fr[j] + u * (fr[j + 1] - fr[j]);
    }
  }
  return best;
}

export function buildProgress(replay: Replay, crossings: Map<number, number[]>): ProgressModel {
  const { frameCount, startMs, stepMs, outline } = replay;
  const fr = outlineFractions(outline);
  const byDriver = new Map<number, Float32Array>();
  const front = new Float32Array(frameCount);

  for (const d of replay.drivers) {
    const c = crossings.get(d.driver) ?? [];
    const out = new Float32Array(frameCount).fill(NaN);
    let hint = -1;
    for (let f = 0; f < frameCount; f++) {
      const x = d.xy[f * 2];
      const y = d.xy[f * 2 + 1];
      if (x == null || y == null) {
        hint = -1;
        continue;
      }
      const t = startMs + f * stepMs;
      hint = nearest(outline, x, y, hint, 12);
      let frac = segmentFraction(outline, fr, hint, x, y);
      const done = countUpTo(c, t);
      // Line crossings come from timing data, geometry from GPS; reconcile near the line.
      const prev = done === 0 ? 0 : c[done - 1];
      const next = c[done];
      const timeFrac = next != null && next > prev ? (t - prev) / (next - prev) : frac;
      if (frac - timeFrac > 0.5) frac -= 1;
      else if (timeFrac - frac > 0.5) frac += 1;
      out[f] = t < 0 ? Math.min(frac, 0) : done + frac;
    }
    byDriver.set(d.driver, out);
  }

  let max = -Infinity;
  for (let f = 0; f < frameCount; f++) {
    for (const arr of byDriver.values()) if (arr[f] > max) max = arr[f];
    front[f] = max;
  }
  return { startMs, stepMs, byDriver, front };
}

/** Progress of one car at time t (nearest frame), or NaN when it has no position data. */
export function progressOf(pm: ProgressModel, driver: number, t: number): number {
  const arr = pm.byDriver.get(driver);
  if (!arr) return NaN;
  const f = Math.round((t - pm.startMs) / pm.stepMs);
  return f < 0 || f >= arr.length ? NaN : arr[f];
}

/** How far the lead car had got at time t. */
export function frontAt(pm: ProgressModel, t: number): number {
  const f = Math.min(pm.front.length - 1, Math.max(0, Math.round((t - pm.startMs) / pm.stepMs)));
  return pm.front[f];
}

/** Seconds since the race front was at `progress`, measured at time t. */
export function gapToFront(pm: ProgressModel, progress: number, t: number): number {
  const fNow = Math.min(pm.front.length - 1, Math.max(0, Math.round((t - pm.startMs) / pm.stepMs)));
  // front is non-decreasing: binary search for the first frame where it reached `progress`.
  let lo = 0;
  let hi = fNow;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pm.front[mid] >= progress) hi = mid;
    else lo = mid + 1;
  }
  // Interpolate within the frame for sub-step precision.
  const a = pm.front[lo - 1] ?? pm.front[lo];
  const b = pm.front[lo];
  const within = b > a ? (progress - a) / (b - a) : 1;
  const reachedAt = pm.startMs + (lo - 1 + Math.min(1, Math.max(0, within))) * pm.stepMs;
  return Math.max(0, (t - reachedAt) / 1000);
}
