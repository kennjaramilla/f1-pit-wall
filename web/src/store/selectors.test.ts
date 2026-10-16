import { describe, expect, it } from "vitest";
import { makeBundle } from "@/test/fixtures";
import { f1Api } from "./f1Api";
import { raceOpened, seeked } from "./replaySlice";
import { selectCurrentLap, selectLeaderboard, selectRaceModel, selectSelected, selectTrackStatus } from "./selectors";
import { makeStore } from "./store";

async function storeWithRace() {
  const store = makeStore();
  await store.dispatch(f1Api.util.upsertQueryData("race", 1, makeBundle()));
  store.dispatch(raceOpened({ raceKey: 1, min: -10_000, max: 300_000 }));
  return store;
}

describe("selectors", () => {
  it("build the race model from the RTK Query cache and memoise it", async () => {
    const store = await storeWithRace();
    const model = selectRaceModel(store.getState());
    expect(model?.totalLaps).toBe(3);
    store.dispatch(seeked(5_000));
    expect(selectRaceModel(store.getState())).toBe(model);
  });

  it("derive lap, track status and leaderboard from race time", async () => {
    const store = await storeWithRace();
    expect(selectTrackStatus(store.getState())).toBe("green");
    store.dispatch(seeked(120_000));
    expect(selectCurrentLap(store.getState())).toBe(2);
    expect(selectTrackStatus(store.getState())).toBe("sc");
    expect(selectLeaderboard(store.getState()).map((r) => r.driver.acronym)).toEqual(["AAA", "BBB", "CCC"]);
    store.dispatch(seeked(280_000));
    expect(selectTrackStatus(store.getState())).toBe("chequered");
  });

  it("returns a stable Set for the selection", async () => {
    const store = await storeWithRace();
    expect(selectSelected(store.getState())).toBe(selectSelected(store.getState()));
  });
});
