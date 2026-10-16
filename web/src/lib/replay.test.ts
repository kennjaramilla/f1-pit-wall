import { describe, expect, it } from "vitest";
import { boundsOf, carPosition, flipY, projectionFor } from "./replay";
import type { Replay } from "./types";

describe("carPosition", () => {
  const replay: Replay = { startMs: 0, stepMs: 1000, frameCount: 4, outline: [], drivers: [] };
  const xy = [0, 0, 10, 20, null, null, 30, 40];

  it("interpolates between frames", () => {
    expect(carPosition(replay, xy, 500)).toEqual([5, 10]);
  });

  it("holds the last known point into a gap and hides cars with no data", () => {
    expect(carPosition(replay, xy, 1200)).toEqual([10, 20]);
    expect(carPosition(replay, xy, 2200)).toBeNull();
    expect(carPosition(replay, xy, 2800)).toEqual([30, 40]);
    expect(carPosition(replay, xy, -1)).toBeNull();
  });
});

describe("projection", () => {
  it("rotates tall circuits to landscape and keeps wide ones", () => {
    const tall = [
      [0, 0],
      [100, 0],
      [100, 1000],
      [0, 1000],
    ];
    const wide = [
      [0, 0],
      [1000, 0],
      [1000, 100],
      [0, 100],
    ];
    expect(projectionFor(wide)).toBe(flipY);
    const b = boundsOf(tall, 0, projectionFor(tall));
    expect(b.maxX - b.minX).toBeGreaterThan(b.maxY - b.minY);
  });
});
