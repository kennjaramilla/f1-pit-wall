import { describe, expect, it } from "vitest";
import {
  driverToggled,
  paused,
  played,
  raceOpened,
  replaySlice,
  seeked,
  selectionCleared,
  speedChanged,
  timeSynced,
  type ReplayState,
} from "./replaySlice";
import { driverPicked, telemetrySlice } from "./telemetrySlice";

const reduce = (actions: Parameters<typeof replaySlice.reducer>[1][], state: ReplayState = replaySlice.getInitialState()): ReplayState =>
  actions.reduce(replaySlice.reducer, state);
const opened = reduce([raceOpened({ raceKey: 1, min: -10_000, max: 100_000 })]);

describe("replaySlice", () => {
  it("opens a race at lights out, keeping the chosen speed", () => {
    const s = reduce([speedChanged(64), raceOpened({ raceKey: 1, min: -10_000, max: 100_000 })]);
    expect(s).toMatchObject({ raceKey: 1, t: 0, playing: false, speed: 64, selected: [] });
  });

  it("ignores re-opening the race that is already open", () => {
    const s = reduce([seeked(42_000), raceOpened({ raceKey: 1, min: -10_000, max: 100_000 })], opened);
    expect(s.t).toBe(42_000);
  });

  it("clamps seeks and marks them so the animation clock jumps", () => {
    const s = reduce([seeked(-999_999)], opened);
    expect(s.t).toBe(-10_000);
    expect(s.seekId).toBe(opened.seekId + 1);
  });

  it("syncs time without counting as a seek and stops at the end", () => {
    const s = reduce([played(), timeSynced(50_000)], opened);
    expect(s).toMatchObject({ t: 50_000, playing: true, seekId: opened.seekId });
    expect(reduce([timeSynced(999_999)], s)).toMatchObject({ t: 100_000, playing: false });
  });

  it("restarts from the beginning when played at the end", () => {
    const s = reduce([seeked(100_000), paused(), played()], opened);
    expect(s).toMatchObject({ t: -10_000, playing: true });
  });

  it("toggles driver selection", () => {
    const s = reduce([driverToggled(1), driverToggled(4), driverToggled(1)], opened);
    expect(s.selected).toEqual([4]);
    expect(reduce([selectionCleared()], s).selected).toEqual([]);
  });
});

describe("telemetrySlice", () => {
  it("stores picks per slot and resets them when another race opens", () => {
    let s = telemetrySlice.reducer(undefined, driverPicked({ slot: 1, driver: 16 }));
    s = telemetrySlice.reducer(s, driverPicked({ slot: 0, driver: 81 }));
    expect(s.picks).toEqual([81, 16]);
    expect(telemetrySlice.reducer(s, raceOpened({ raceKey: 2, min: 0, max: 1 })).picks).toEqual([null, null]);
  });
});
