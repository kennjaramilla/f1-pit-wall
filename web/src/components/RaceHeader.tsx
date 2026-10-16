"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format";
import type { RaceModel } from "@/lib/race";
import { useAppSelector } from "@/store/hooks";
import { selectTrackStatus } from "@/store/selectors";

const STATUS = {
  pre: { label: "Formation", className: "bg-panel-3 text-text" },
  green: { label: "Green flag", className: "bg-green text-black" },
  sc: { label: "Safety car", className: "bg-sc text-black" },
  vsc: { label: "Virtual safety car", className: "bg-vsc text-black" },
  red: { label: "Red flag", className: "bg-red text-black" },
  chequered: { label: "Chequered flag", className: "bg-text text-bg" },
} as const;

export function RaceHeader({ model }: { model: RaceModel }) {
  const status = useAppSelector(selectTrackStatus);
  const race = model.bundle.race;

  return (
    <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-2">
      <div>
        <Link href="/" className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-text">
          ← All races
        </Link>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
          {race.name} <span className="text-muted">{race.year}</span>
        </h1>
        <p className="text-sm text-muted">
          {race.circuit} · {formatDate(race.raceStartUtc)} · {race.totalLaps} laps
        </p>
      </div>
      <p className="ml-auto" aria-live="polite">
        <span
          className={`rounded-md px-3 py-1.5 text-sm font-bold uppercase tracking-wider ${STATUS[status].className}`}
          data-cy="track-status"
        >
          <span aria-hidden className="mr-1.5">
            ⚑
          </span>
          {STATUS[status].label}
        </span>
      </p>
    </div>
  );
}
