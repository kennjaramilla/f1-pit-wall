import { combineSlices, configureStore } from "@reduxjs/toolkit";
import { f1Api } from "./f1Api";
import { replaySlice } from "./replaySlice";
import { telemetrySlice } from "./telemetrySlice";

const rootReducer = combineSlices(f1Api, replaySlice, telemetrySlice);

export type RootState = ReturnType<typeof rootReducer>;

/** One store per request/tab (App Router guidance: never a module-level singleton). */
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefault) => getDefault().concat(f1Api.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore["dispatch"];
