import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export const SPEEDS = [1, 4, 16, 32, 64] as const;
export type Speed = (typeof SPEEDS)[number];

export interface ReplayState {
  raceKey: number | null;
  min: number;
  max: number;
  /** Race time (ms from lights out), synced from the animation clock a few times per second. */
  t: number;
  /** Bumped on user seeks so the animation clock knows to jump, unlike routine time syncs. */
  seekId: number;
  playing: boolean;
  speed: Speed;
  selected: number[];
}

const initialState: ReplayState = { raceKey: null, min: 0, max: 0, t: 0, seekId: 0, playing: false, speed: 16, selected: [] };

const clamp = (s: ReplayState, t: number) => Math.min(s.max, Math.max(s.min, t));

export const replaySlice = createSlice({
  name: "replay",
  initialState,
  reducers: {
    raceOpened(state, { payload }: PayloadAction<{ raceKey: number; min: number; max: number }>) {
      if (state.raceKey === payload.raceKey) return;
      return { ...initialState, ...payload, speed: state.speed, seekId: state.seekId + 1 };
    },
    played(state) {
      if (state.t >= state.max) {
        state.t = state.min;
        state.seekId++;
      }
      state.playing = true;
    },
    paused(state) {
      state.playing = false;
    },
    seeked(state, { payload }: PayloadAction<number>) {
      state.t = clamp(state, payload);
      state.seekId++;
    },
    /** Routine sync from the animation clock; stops playback at the end. */
    timeSynced(state, { payload }: PayloadAction<number>) {
      state.t = clamp(state, payload);
      if (state.t >= state.max) state.playing = false;
    },
    speedChanged(state, { payload }: PayloadAction<Speed>) {
      state.speed = payload;
    },
    driverToggled(state, { payload }: PayloadAction<number>) {
      state.selected = state.selected.includes(payload) ? state.selected.filter((d) => d !== payload) : [...state.selected, payload];
    },
    selectionCleared(state) {
      state.selected = [];
    },
  },
});

export const { raceOpened, played, paused, seeked, timeSynced, speedChanged, driverToggled, selectionCleared } = replaySlice.actions;
