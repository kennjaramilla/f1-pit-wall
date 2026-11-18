import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildRaceModel } from "@/lib/race";
import { f1Api } from "@/store/f1Api";
import { driverToggled, raceOpened } from "@/store/replaySlice";
import { makeStore } from "@/store/store";
import { makeBundle } from "@/test/fixtures";
import { renderWithStore } from "@/test/render";
import { RacePace } from "./RacePace";

async function storeWithRace(bundle = makeBundle()) {
  const store = makeStore();
  await store.dispatch(f1Api.util.upsertQueryData("race", 1, bundle));
  store.dispatch(raceOpened({ raceKey: 1, min: -10_000, max: 300_000 }));
  return store;
}

describe("RacePace", () => {
  beforeAll(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );
  });

  it("explains the filter and shows the fastest drivers by default", async () => {
    const store = await storeWithRace();
    renderWithStore(<RacePace model={buildRaceModel(makeBundle())} />, store);
    expect(screen.getByText(/Showing the fastest 1/)).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("switches to the selected drivers", async () => {
    const store = await storeWithRace();
    store.dispatch(driverToggled(1));
    renderWithStore(<RacePace model={buildRaceModel(makeBundle())} />, store);
    expect(screen.getByText(/Showing your selected drivers/)).toBeInTheDocument();
  });

  it("shows an empty state without clean laps", async () => {
    const bundle = makeBundle();
    bundle.laps = bundle.laps.filter((l) => l.lap === 1);
    const store = await storeWithRace(bundle);
    renderWithStore(<RacePace model={buildRaceModel(bundle)} />, store);
    expect(screen.getByText(/No clean green-flag laps/)).toBeInTheDocument();
  });
});
