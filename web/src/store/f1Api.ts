import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { RaceBundle, RaceSummary, Replay, Telemetry } from "@/lib/types";

// Live mode calls the .NET API; snapshot mode reads the JSON files the same API exported.
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
export const dataMode: "live" | "snapshot" = API_URL ? "live" : "snapshot";

// Absolute even in snapshot mode: fetchBaseQuery builds a Request, which needs a full URL outside the browser.
const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
const rawBaseQuery = fetchBaseQuery({ baseUrl: API_URL ? `${API_URL}/api` : `${origin}/data` });

/** Endpoints are written as API paths ("/races/1/replay"); snapshot mode maps them to "/data/races/1/replay.json". */
const baseQuery: BaseQueryFn<string, unknown, FetchBaseQueryError> = (path, api, extra) =>
  rawBaseQuery((API_URL ? path : `${path}.json`) satisfies string | FetchArgs, api, extra);

export const f1Api = createApi({
  reducerPath: "f1Api",
  baseQuery,
  // Ingested race data never changes; keep it for the whole session.
  keepUnusedDataFor: 3600,
  endpoints: (build) => ({
    races: build.query<RaceSummary[], void>({ query: () => "/races" }),
    race: build.query<RaceBundle, number>({ query: (key) => `/races/${key}` }),
    replay: build.query<Replay, number>({ query: (key) => `/races/${key}/replay` }),
    telemetryDrivers: build.query<number[], number>({ query: (key) => `/races/${key}/telemetry` }),
    telemetry: build.query<Telemetry, { key: number; driver: number }>({ query: ({ key, driver }) => `/races/${key}/telemetry/${driver}` }),
  }),
});

export const { useRacesQuery, useRaceQuery, useReplayQuery, useTelemetryDriversQuery, useTelemetryQuery } = f1Api;

/** Human-readable message for an RTK Query error. */
export function errorMessage(error: unknown): string {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  if (status === 404) return "This race isn't in the cache yet.";
  if (status === "FETCH_ERROR") return dataMode === "live" ? "Can't reach the Pit Wall API." : "Network error while loading race data.";
  return typeof status === "number" ? `Request failed (${status}).` : "Something went wrong loading race data.";
}
