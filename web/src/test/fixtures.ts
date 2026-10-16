import type { RaceBundle } from "@/lib/types";

const driver = (number: number, acronym: string, team: string) => ({
  number,
  acronym,
  fullName: `Driver ${acronym}`,
  team,
  colour: team === "Red" ? "ff0000" : "0000ff",
  headshotUrl: null,
});

/** Three cars, 3 laps of ~90s. Car 2 pits on lap 2; car 3 retires after lap 1. */
export function makeBundle(): RaceBundle {
  return {
    race: {
      sessionKey: 1,
      year: 2025,
      name: "Test Grand Prix",
      country: "Testland",
      circuit: "Testring",
      raceStartUtc: "2025-01-01T12:00:00Z",
      totalLaps: 3,
      winner: null,
      outline: [],
    },
    windowStartMs: -10_000,
    windowEndMs: 300_000,
    drivers: [driver(1, "AAA", "Red"), driver(2, "BBB", "Red"), driver(3, "CCC", "Blue")],
    lapStarts: [
      { lap: 1, t: 0 },
      { lap: 2, t: 90_000 },
      { lap: 3, t: 180_000 },
    ],
    laps: [
      { driver: 1, lap: 1, t: 0, durationMs: 90_000, s1: null, s2: null, s3: null, pitOut: false },
      { driver: 1, lap: 2, t: 90_000, durationMs: 90_000, s1: null, s2: null, s3: null, pitOut: false },
      { driver: 1, lap: 3, t: 180_000, durationMs: 90_000, s1: null, s2: null, s3: null, pitOut: false },
      { driver: 2, lap: 1, t: 0, durationMs: 91_000, s1: null, s2: null, s3: null, pitOut: false },
      { driver: 2, lap: 2, t: 91_000, durationMs: 110_000, s1: null, s2: null, s3: null, pitOut: false },
      { driver: 2, lap: 3, t: 201_000, durationMs: 88_000, s1: null, s2: null, s3: null, pitOut: true },
      { driver: 3, lap: 1, t: 0, durationMs: 95_000, s1: null, s2: null, s3: null, pitOut: false },
    ],
    stints: [
      { driver: 1, stint: 1, compound: "MEDIUM", lapStart: 1, lapEnd: 3, tyreAgeAtStart: 0 },
      { driver: 2, stint: 1, compound: "SOFT", lapStart: 1, lapEnd: 2, tyreAgeAtStart: 2 },
      { driver: 2, stint: 2, compound: "HARD", lapStart: 3, lapEnd: 3, tyreAgeAtStart: 0 },
      { driver: 3, stint: 1, compound: "SOFT", lapStart: 1, lapEnd: 1, tyreAgeAtStart: 0 },
    ],
    pits: [{ driver: 2, lap: 2, t: 190_000, laneDuration: 20, stopDuration: 2.4 }],
    positions: [
      { driver: 1, t: 0, position: 1 },
      { driver: 2, t: 0, position: 2 },
      { driver: 3, t: 0, position: 3 },
    ],
    events: [
      { t: 0, lap: 1, kind: "green", message: "GREEN LIGHT", driver: null },
      { t: 100_000, lap: 2, kind: "sc", message: "SAFETY CAR DEPLOYED", driver: null },
    ],
    periods: [{ kind: "sc", startMs: 100_000, endMs: 150_000 }],
    gaps: [],
    fastestLaps: [],
    classification: [
      { position: 1, driver: 1, lapsCompleted: 3, status: "Finished" },
      { position: 2, driver: 2, lapsCompleted: 3, status: "Finished" },
      { position: 3, driver: 3, lapsCompleted: 1, status: "DNF" },
    ],
  };
}
