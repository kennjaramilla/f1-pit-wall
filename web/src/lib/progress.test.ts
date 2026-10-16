import { describe, expect, it } from "vitest";
import { buildProgress, frontAt, gapToFront, outlineFractions, progressOf } from "./progress";
import type { Replay } from "./types";

// A 400m square lap; car A laps in 40s, car B is 4s behind on the same pace.
const outline = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
  [0, 0],
];

function posAt(t: number): [number, number] {
  const d = ((t / 40_000) * 400) % 400;
  if (d < 100) return [d, 0];
  if (d < 200) return [100, d - 100];
  if (d < 300) return [300 - d, 100];
  return [0, 400 - d];
}

function replay(): Replay {
  const frames = 200; // 0..99.5s at 500ms
  const mk = (delay: number) => {
    const xy: (number | null)[] = [];
    for (let f = 0; f < frames; f++) {
      const t = f * 500 - delay;
      const [x, y] = t < 0 ? [0, 0] : posAt(t);
      xy.push(x, y);
    }
    return xy;
  };
  return {
    startMs: 0,
    stepMs: 500,
    frameCount: frames,
    outline,
    drivers: [
      { driver: 1, xy: mk(0) },
      { driver: 2, xy: mk(4000) },
    ],
  };
}

describe("progress", () => {
  it("computes cumulative outline fractions", () => {
    expect(Array.from(outlineFractions(outline))).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });

  it("measures the gap as time since the front was at the same point", () => {
    const crossings = new Map([
      [1, [40_000, 80_000]],
      [2, [44_000, 84_000]],
    ]);
    const pm = buildProgress(replay(), crossings);
    expect(progressOf(pm, 1, 50_000)).toBeCloseTo(1.25, 2);
    expect(frontAt(pm, 50_000)).toBeCloseTo(1.25, 2);
    const gap = gapToFront(pm, progressOf(pm, 2, 50_000), 50_000);
    expect(gap).toBeCloseTo(4, 1);
  });
});
