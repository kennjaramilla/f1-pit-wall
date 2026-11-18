import { describe, expect, it } from "vitest";
import { makeBundle } from "@/test/fixtures";
import { cleanLaps, excludeReason, median, racePace, slope, spread, stintPace } from "./pace";
import { buildRaceModel } from "./race";
import type { RaceBundle } from "./types";

/** Driver 1 on a clean 5-lap run with one slow lap (traffic) on lap 4. */
function paceBundle(): RaceBundle {
  const b = makeBundle();
  b.race.totalLaps = 5;
  b.periods = [];
  const times = [95_000, 90_000, 90_400, 99_000, 89_800];
  let t = 0;
  b.laps = b.laps.filter((l) => l.driver !== 1);
  times.forEach((d, i) => {
    b.laps.push({ driver: 1, lap: i + 1, t, durationMs: d, s1: null, s2: null, s3: null, pitOut: false });
    t += d;
  });
  return b;
}

describe("median and spread", () => {
  it("handle odd, even and tiny inputs", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(spread([5])).toBeNull();
    expect(spread([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });
});

describe("excludeReason", () => {
  const model = buildRaceModel(makeBundle());
  const lap = (driver: number, n: number) => model.bundle.laps.find((l) => l.driver === driver && l.lap === n)!;

  it("drops the opening lap, pit laps and laps under a safety car", () => {
    expect(excludeReason(model, lap(1, 1))).toBe("lap1");
    expect(excludeReason(model, lap(2, 2))).toBe("pit");
    expect(excludeReason(model, lap(2, 3))).toBe("pit");
    expect(excludeReason(model, lap(1, 2))).toBe("neutralised");
    expect(excludeReason(model, lap(1, 3))).toBeNull();
  });

  it("drops laps with no timing", () => {
    expect(excludeReason(model, { ...lap(1, 3), durationMs: null })).toBe("missing");
  });
});

describe("cleanLaps", () => {
  it("keeps green-flag laps and removes slow outliers", () => {
    const model = buildRaceModel(paceBundle());
    expect(cleanLaps(model, 1).map((l) => l.lap)).toEqual([2, 3, 5]);
  });
});

describe("racePace", () => {
  it("ranks drivers by median pace with a delta to the fastest", () => {
    const b = paceBundle();
    b.laps.push(
      { driver: 2, lap: 2, t: 0, durationMs: 91_000, s1: null, s2: null, s3: null, pitOut: false },
      { driver: 2, lap: 4, t: 400_000, durationMs: 91_500, s1: null, s2: null, s3: null, pitOut: false },
    );
    b.laps = b.laps.filter((l) => !(l.driver === 2 && l.lap === 2 && l.durationMs === 110_000));
    b.pits = [];
    const rows = racePace(buildRaceModel(b));
    expect(rows.map((r) => r.driver)).toEqual([1, 2, 3]);
    expect(rows[0]).toMatchObject({ bestMs: 89_800, medianMs: 90_000, deltaMs: 0 });
    expect(rows[1].deltaMs).toBe(1_250);
    expect(rows[2]).toMatchObject({ medianMs: null, deltaMs: null, laps: [] });
  });
});

describe("stintPace", () => {
  it("fits a degradation slope per stint from tyre age", () => {
    const b = makeBundle();
    b.race.totalLaps = 8;
    b.periods = [];
    b.pits = [{ driver: 1, lap: 4, t: 0, laneDuration: 20, stopDuration: 2.5 }];
    b.stints = [
      { driver: 1, stint: 1, compound: "SOFT", lapStart: 1, lapEnd: 4, tyreAgeAtStart: 0 },
      { driver: 1, stint: 2, compound: "HARD", lapStart: 5, lapEnd: 8, tyreAgeAtStart: 3 },
    ];
    const times = [96_000, 90_000, 90_100, 110_000, 100_000, 91_000, 91_050, 91_100];
    let t = 0;
    b.laps = times.map((d, i) => {
      const lap = { driver: 1, lap: i + 1, t, durationMs: d, s1: null, s2: null, s3: null, pitOut: i === 4 };
      t += d;
      return lap;
    });
    const [soft, hard] = stintPace(buildRaceModel(b), 1);
    expect(soft).toMatchObject({ compound: "SOFT", laps: 2, avgMs: 90_050, degMsPerLap: null });
    expect(hard).toMatchObject({ compound: "HARD", laps: 3, avgMs: 91_050 });
    expect(hard.degMsPerLap).toBeCloseTo(50);
  });

  it("returns null slope for a flat x axis", () => {
    expect(slope([[1, 1], [1, 2], [1, 3]])).toBeNull();
    expect(slope([[0, 0], [1, 2], [2, 4]])).toBe(2);
  });
});
