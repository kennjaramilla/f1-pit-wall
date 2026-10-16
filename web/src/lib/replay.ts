import type { Replay } from "./types";

/** Car position at time t, linearly interpolated between grid frames. */
export function carPosition(replay: Replay, xy: (number | null)[], t: number): [number, number] | null {
  const f = (t - replay.startMs) / replay.stepMs;
  if (f < 0 || f > replay.frameCount - 1) return null;
  const i = Math.floor(f);
  const frac = f - i;
  const ax = xy[i * 2];
  const ay = xy[i * 2 + 1];
  const bx = xy[(i + 1) * 2];
  const by = xy[(i + 1) * 2 + 1];
  if (ax == null || ay == null) return bx != null && by != null && frac > 0.5 ? [bx, by] : null;
  if (bx == null || by == null) return [ax, ay];
  return [ax + (bx - ax) * frac, ay + (by - ay) * frac];
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type Projection = (x: number, y: number) => [number, number];

/** World -> SVG coordinates. OpenF1 y grows upward, so it is flipped. */
export const flipY: Projection = (x, y) => [x, -y];

/** Like flipY, but turns tall circuits on their side so they fill a landscape panel. */
export function projectionFor(points: number[][]): Projection {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return maxY - minY > (maxX - minX) * 1.15 ? (x, y) => [y, x] : flipY;
}

/** Bounds in SVG space. */
export function boundsOf(points: number[][], padRatio = 0.06, project: Projection = flipY): Bounds {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [rx, ry] of points) {
    const [x, y] = project(rx, ry);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  const pad = Math.max(maxX - minX, maxY - minY) * padRatio;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

/** SVG path for a closed outline. */
export function outlinePath(points: number[][], project: Projection = flipY): string {
  if (points.length === 0) return "";
  return (
    points
      .map(([x, y], i) => {
        const [px, py] = project(x, y);
        return `${i === 0 ? "M" : "L"}${px} ${py}`;
      })
      .join(" ") + " Z"
  );
}
