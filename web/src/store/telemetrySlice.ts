import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { raceOpened } from "./replaySlice";

export interface TelemetryState {
  /** Drivers compared in the telemetry tab; null = use the default pairing. */
  picks: [number | null, number | null];
}

const initialState: TelemetryState = { picks: [null, null] };

export const telemetrySlice = createSlice({
  name: "telemetry",
  initialState,
  reducers: {
    driverPicked(state, { payload }: PayloadAction<{ slot: 0 | 1; driver: number }>) {
      state.picks[payload.slot] = payload.driver;
    },
  },
  extraReducers: (builder) => builder.addCase(raceOpened, () => initialState),
});

export const { driverPicked } = telemetrySlice.actions;
