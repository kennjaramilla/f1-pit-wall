import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { fromDto, type Note, type NoteDto, type NoteInput } from "@/lib/notes";
import type { RaceBundle, RaceSummary, Replay, Telemetry } from "@/lib/types";

// Live mode goes through the Next.js proxy route (/api/live), which forwards to the .NET API with the
// user's token; snapshot mode reads the JSON files the same API exported.
export const dataMode: "live" | "snapshot" = process.env.NEXT_PUBLIC_DATA_MODE === "live" ? "live" : "snapshot";
const live = dataMode === "live";

// Absolute URL: fetchBaseQuery builds a Request, which needs one outside the browser (tests).
const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin;
const rawBaseQuery = fetchBaseQuery({ baseUrl: `${origin}${live ? "/api/live" : "/data"}` });

/**
 * Endpoints are written as API paths ("/races/1/replay"); snapshot mode maps them to "/data/races/1/replay.json".
 * Writes (FetchArgs with a method) only exist in live mode and pass straight through.
 */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = (args, api, extra) =>
  rawBaseQuery(typeof args === "string" && !live ? `${args}.json` : args, api, extra);

type NoteChanges = Partial<Omit<NoteInput, "raceKey">>;
const raceTag = (raceKey: number) => [{ type: "Note" as const, id: raceKey }];

export const f1Api = createApi({
  reducerPath: "f1Api",
  baseQuery,
  // Ingested race data never changes; keep it for the whole session.
  keepUnusedDataFor: 3600,
  tagTypes: ["Note"],
  endpoints: (build) => ({
    races: build.query<RaceSummary[], void>({ query: () => "/races" }),
    race: build.query<RaceBundle, number>({ query: (key) => `/races/${key}` }),
    replay: build.query<Replay, number>({ query: (key) => `/races/${key}/replay` }),
    telemetryDrivers: build.query<number[], number>({ query: (key) => `/races/${key}/telemetry` }),
    telemetry: build.query<Telemetry, { key: number; driver: number }>({ query: ({ key, driver }) => `/races/${key}/telemetry/${driver}` }),

    // Race notes (live mode only). userId is part of the cache key so one user never sees another's cached notes.
    raceNotes: build.query<Note[], { raceKey: number; userId: string }>({
      query: ({ raceKey }) => `/races/${raceKey}/notes`,
      transformResponse: (notes: NoteDto[], _meta, { userId }) => notes.map((n) => fromDto(n, userId)),
      providesTags: (_result, _error, { raceKey }) => raceTag(raceKey),
      keepUnusedDataFor: 60,
    }),
    addNote: build.mutation<NoteDto, NoteInput>({
      query: ({ raceKey, ...body }) => ({ url: `/races/${raceKey}/notes`, method: "POST", body }),
      invalidatesTags: (_result, _error, { raceKey }) => raceTag(raceKey),
    }),
    updateNote: build.mutation<NoteDto, { id: string; raceKey: number; changes: NoteChanges }>({
      query: ({ id, changes }) => ({ url: `/notes/${id}`, method: "PATCH", body: changes }),
      invalidatesTags: (_result, _error, { raceKey }) => raceTag(raceKey),
    }),
    deleteNote: build.mutation<void, { id: string; raceKey: number }>({
      query: ({ id }) => ({ url: `/notes/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, { raceKey }) => raceTag(raceKey),
    }),
  }),
});

export const {
  useRacesQuery,
  useRaceQuery,
  useReplayQuery,
  useTelemetryDriversQuery,
  useTelemetryQuery,
  useRaceNotesQuery,
  useAddNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
} = f1Api;

/** Human-readable message for an RTK Query error. */
export function errorMessage(error: unknown): string {
  const status = (error as FetchBaseQueryError | undefined)?.status;
  if (status === 404) return "This race isn't in the cache yet.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "Your role doesn't include this data.";
  if (status === "FETCH_ERROR") return live ? "Can't reach the Pit Wall API." : "Network error while loading race data.";
  return typeof status === "number" ? `Request failed (${status}).` : "Something went wrong loading race data.";
}
