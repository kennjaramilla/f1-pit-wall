import { describe, expect, it } from "vitest";
import { makeBundle } from "@/test/fixtures";
import {
  buildRaceModel,
  countUpTo,
  currentLap,
  gapAt,
  lapCrossings,
  leaderboardAt,
  periodAt,
  pitStatusAt,
  recentEvents,
  stintAt,
} from "./race";

const model = buildRaceModel(makeBundle());

describe("race model", () => {
  it("derives line crossings, preferring the next lap's start", () => {
    expect(model.crossings.get(2)).toEqual([91_000, 201_000, 289_000]);
    expect(model.crossings.get(3)).toEqual([95_000]);
    expect(model.leaderCross).toEqual([90_000, 180_000, 270_000]);
    expect(lapCrossings([{ lap: 1, t: 0, durationMs: null }])).toEqual([]);
  });

  it("marks the lower-classified teammate as secondary (dashed)", () => {
    expect(model.secondary.has(2)).toBe(true);
    expect(model.secondary.has(1)).toBe(false);
  });

  it("counts sorted values up to t", () => {
    expect(countUpTo([1, 2, 3], 0)).toBe(0);
    expect(countUpTo([1, 2, 3], 2)).toBe(2);
    expect(countUpTo([1, 2, 3], 9)).toBe(3);
  });

  it("reports the leader's current lap, clamped to race distance", () => {
    expect(currentLap(model, -5000)).toBe(1);
    expect(currentLap(model, 95_000)).toBe(2);
    expect(currentLap(model, 999_999)).toBe(3);
  });

  it("interpolates gaps from timing when no GPS model is given", () => {
    const g = gapAt(model, 2, 135_500); // halfway through lap 2 for car 2 (91s → 201s)
    expect(g.lapsCompleted).toBe(1);
    expect(g.progress).toBeCloseTo(1.404, 2);
    expect(g.gapSec).toBeGreaterThan(0);
    // After the flag the gap is the final line-crossing difference.
    expect(gapAt(model, 2, 295_000).gapSec).toBe(19);
  });

  it("knows the tyre and its age for a given lap", () => {
    expect(stintAt(model, 2, 2)).toMatchObject({ stint: { compound: "SOFT" }, age: 3 });
    expect(stintAt(model, 2, 3)).toMatchObject({ stint: { compound: "HARD" }, age: 0 });
  });

  it("tracks pit stops and whether the car is in the lane", () => {
    expect(pitStatusAt(model, 2, 195_000)).toEqual({ stops: 1, inPit: true });
    expect(pitStatusAt(model, 2, 230_000)).toEqual({ stops: 1, inPit: false });
    expect(pitStatusAt(model, 2, 10_000)).toEqual({ stops: 0, inPit: false });
  });

  it("finds track-status periods and recent events", () => {
    expect(periodAt(model.bundle.periods, 120_000)?.kind).toBe("sc");
    expect(periodAt(model.bundle.periods, 160_000)).toBeNull();
    expect(recentEvents(model.bundle.events, 120_000).map((e) => e.kind)).toEqual(["sc", "green"]);
  });

  it("builds a leaderboard with retired cars at the bottom", () => {
    const rows = leaderboardAt(model, 260_000);
    expect(rows.map((r) => r.driver.acronym)).toEqual(["AAA", "BBB", "CCC"]);
    expect(rows[0].gap.gapSec).toBe(0);
    expect(rows[2].retired).toBe(true);
    expect(rows[1].compound).toBe("HARD");
  });
});
