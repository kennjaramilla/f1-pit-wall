import { createSelector } from "@reduxjs/toolkit";
import { buildProgress } from "@/lib/progress";
import { buildRaceModel, currentLap, leaderboardAt, periodAt, recentEvents } from "@/lib/race";
import { f1Api } from "./f1Api";
import type { RootState } from "./store";

export const selectReplay = (s: RootState) => s.replay;
export const selectRaceTime = (s: RootState) => s.replay.t;
export const selectRaceKey = (s: RootState) => s.replay.raceKey;

export const selectSelected = createSelector([(s: RootState) => s.replay.selected], (ids) => new Set(ids));

/** Data for the open race straight from the RTK Query cache. */
const selectBundle = (s: RootState) => (s.replay.raceKey == null ? undefined : f1Api.endpoints.race.select(s.replay.raceKey)(s).data);
const selectReplayFrames = (s: RootState) =>
  s.replay.raceKey == null ? undefined : f1Api.endpoints.replay.select(s.replay.raceKey)(s).data;

export const selectRaceModel = createSelector([selectBundle], (bundle) => (bundle ? buildRaceModel(bundle) : null));

/** GPS-based progress keeps leaderboard gaps right through pit stops; null until positions load. */
export const selectProgress = createSelector([selectReplayFrames, selectRaceModel], (replay, model) =>
  replay && model ? buildProgress(replay, model.crossings) : null,
);

export const selectLeaderboard = createSelector([selectRaceModel, selectProgress, selectRaceTime], (model, progress, t) =>
  model ? leaderboardAt(model, t, progress) : [],
);

export const selectCurrentLap = createSelector([selectRaceModel, selectRaceTime], (model, t) => (model ? currentLap(model, t) : 1));

export type TrackStatus = "pre" | "green" | "sc" | "vsc" | "red" | "chequered";

export const selectTrackStatus = createSelector([selectRaceModel, selectRaceTime], (model, t): TrackStatus => {
  if (!model || t < 0) return "pre";
  if (t >= model.finishMs) return "chequered";
  return periodAt(model.bundle.periods, t)?.kind ?? "green";
});

export const selectRecentEvents = createSelector([selectRaceModel, selectRaceTime], (model, t) =>
  model ? recentEvents(model.bundle.events, t, 4) : [],
);
