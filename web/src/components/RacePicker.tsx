"use client";

import Link from "next/link";
import { formatDate, hex } from "@/lib/format";
import { errorMessage, useRacesQuery } from "@/store/f1Api";
import { EmptyState, ErrorState, Skeleton, TrackOutline } from "./ui";

export function RacePicker() {
  const races = useRacesQuery();

  if (races.isError) return <ErrorState title="Couldn't load races" message={errorMessage(races.error)} onRetry={() => races.refetch()} />;

  if (!races.data)
    return (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading races">
        {[0, 1, 2].map((i) => (
          <li key={i} className="rounded-xl border border-border bg-panel p-5">
            <Skeleton className="mb-4 h-36 w-full" />
            <Skeleton className="mb-2 h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </li>
        ))}
      </ul>
    );

  if (races.data.length === 0) return <EmptyState>No races cached yet. Run the API ingest command to add one.</EmptyState>;

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {races.data.map((r) => (
        <li key={r.sessionKey}>
          <Link
            href={`/race/${r.sessionKey}`}
            data-cy="race-card"
            className="group flex h-full flex-col rounded-xl border border-border bg-panel p-5 transition hover:border-border-strong hover:bg-panel-2"
          >
            <div className="mb-4 flex h-40 items-center justify-center rounded-lg bg-bg/60 p-4 text-faint transition group-hover:text-text">
              <TrackOutline points={r.outline} className="h-full w-full" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">{r.year}</span>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted">{formatDate(r.raceStartUtc)}</span>
            </div>
            <h2 className="mt-1 text-xl font-bold leading-tight">{r.name}</h2>
            <p className="text-sm text-muted">
              {r.circuit} · {r.totalLaps} laps
            </p>
            {r.winner && (
              <p className="mt-auto flex items-center gap-2 pt-4 text-sm">
                <span aria-hidden className="h-4 w-1 rounded-sm" style={{ background: hex(r.winner.colour) }} />
                <span className="text-muted">Winner</span>
                <span className="font-semibold">{r.winner.fullName}</span>
                <span className="text-muted">({r.winner.team})</span>
              </p>
            )}
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
              Open replay{" "}
              <span aria-hidden className="transition group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
