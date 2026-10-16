"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import type { RaceModel } from "@/lib/race";
import { ReplayClockProvider, useReplayEngine } from "@/lib/replayClock";
import { useShortcuts } from "@/lib/useShortcuts";
import { errorMessage, useRaceQuery, useReplayQuery } from "@/store/f1Api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { raceOpened, selectionCleared } from "@/store/replaySlice";
import { selectRaceModel } from "@/store/selectors";
import { AnalysisTabs } from "./AnalysisTabs";
import { Leaderboard } from "./Leaderboard";
import { RaceControlFeed } from "./RaceControlFeed";
import { RaceHeader } from "./RaceHeader";
import { ReplayControls } from "./ReplayControls";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { TrackMap } from "./TrackMap";
import { ErrorState, Kbd, Panel, Skeleton } from "./ui";

export function RaceView({ sessionKey }: { sessionKey: number }) {
  const race = useRaceQuery(sessionKey);
  const replay = useReplayQuery(sessionKey); // start the big download in parallel
  const dispatch = useAppDispatch();
  const model = useAppSelector(selectRaceModel);
  const bundle = race.data;

  useEffect(() => {
    if (bundle) dispatch(raceOpened({ raceKey: sessionKey, min: bundle.windowStartMs, max: bundle.windowEndMs }));
  }, [dispatch, sessionKey, bundle]);

  if (race.isError)
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState title="Couldn't load this race" message={errorMessage(race.error)} onRetry={() => race.refetch()} />
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="text-accent underline">
            Back to all races
          </Link>
        </p>
      </div>
    );
  // The model comes from the store, so this also waits for raceOpened to point it at this race.
  if (!model || model.bundle.race.sessionKey !== sessionKey) return <RaceSkeleton />;
  return <RaceDashboard model={model} replay={replay} />;
}

export function RaceSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6" aria-busy="true" aria-label="Loading race">
      <Skeleton className="mb-2 h-8 w-72" />
      <Skeleton className="mb-6 h-4 w-48" />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-[520px]" />
        <Skeleton className="h-[520px]" />
      </div>
    </div>
  );
}

function RaceDashboard({ model, replay }: { model: RaceModel; replay: ReturnType<typeof useReplayQuery> }) {
  const selectedCount = useAppSelector((s) => s.replay.selected.length);
  const dispatch = useAppDispatch();
  const helpRef = useRef<HTMLDialogElement>(null);
  const showHelp = useCallback(() => helpRef.current?.showModal(), []);
  const clock = useReplayEngine();
  useShortcuts(model.bundle.lapStarts, showHelp);

  return (
    <ReplayClockProvider value={clock}>
      <div className="mx-auto max-w-[1600px] px-4 py-5">
        <RaceHeader model={model} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <Panel className="flex flex-col overflow-hidden">
            <div className="relative aspect-[4/3] max-h-[62vh] w-full p-3 sm:aspect-[16/10]">
              {replay.data ? (
                <TrackMap replay={replay.data} model={model} />
              ) : replay.isError ? (
                <ErrorState title="Track replay unavailable" message={errorMessage(replay.error)} onRetry={() => replay.refetch()} />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Skeleton className="h-full w-full" />
                  <span className="absolute text-sm text-muted">Loading car positions…</span>
                </div>
              )}
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch(selectionCleared())}
                  className="absolute right-4 top-4 rounded-md border border-border bg-panel/90 px-2.5 py-1 text-xs text-muted hover:text-text"
                >
                  Clear selection ({selectedCount}) <Kbd>Esc</Kbd>
                </button>
              )}
            </div>
            <div className="border-t border-border">
              <ReplayControls model={model} onShowHelp={showHelp} />
            </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel title="Timing" id="timing" actions={<span className="text-xs text-muted">Click a driver to follow</span>}>
              <Leaderboard model={model} />
            </Panel>
            <RaceControlFeed />
          </div>
        </div>

        <AnalysisTabs model={model} />
        <ShortcutsDialog ref={helpRef} />
      </div>
    </ReplayClockProvider>
  );
}
