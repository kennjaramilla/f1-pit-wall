"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { timeSynced } from "@/store/replaySlice";
import { useAppDispatch, useAppSelector, useAppStore } from "@/store/hooks";

// Cap one frame's step so a backgrounded tab doesn't jump minutes ahead on return.
const MAX_FRAME_MS = 250;
// How often the animation clock publishes race time to Redux (~5 Hz).
const SYNC_MS = 200;

/**
 * High-frequency race time for animation. Redux holds the same time at a coarse cadence;
 * dispatching every frame would re-run every selector 60 times a second.
 */
export class ReplayClock {
  private listeners = new Set<(t: number) => void>();

  constructor(public t = 0) {}

  subscribe(fn: (t: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  set(t: number): void {
    this.t = t;
    for (const fn of this.listeners) fn(t);
  }

  /** Advance by wall-clock dt (ms) at the given speed, clamped to max. */
  advance(dtMs: number, speed: number, max: number): number {
    this.set(Math.min(max, this.t + Math.min(dtMs, MAX_FRAME_MS) * speed));
    return this.t;
  }
}

const ClockContext = createContext<ReplayClock | null>(null);
export const ReplayClockProvider = ClockContext.Provider;

export function useReplayClock(): ReplayClock {
  const clock = useContext(ClockContext);
  if (!clock) throw new Error("useReplayClock must be used inside ReplayClockProvider");
  return clock;
}

/** Runs the requestAnimationFrame loop while playing and keeps the clock and the store in step. */
export function useReplayEngine(): ReplayClock {
  const store = useAppStore();
  const dispatch = useAppDispatch();
  const [clock] = useState(() => new ReplayClock(store.getState().replay.t));
  const { playing, speed, max, seekId } = useAppSelector((s) => s.replay);

  // User seeks (and race changes) move the clock; routine syncs don't bump seekId.
  useEffect(() => clock.set(store.getState().replay.t), [clock, store, seekId]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last: number | null = null;
    let lastSync = 0;
    const loop = (now: number) => {
      const t = clock.advance(last == null ? 0 : now - last, speed, max);
      last = now;
      if (now - lastSync >= SYNC_MS || t >= max) {
        lastSync = now;
        dispatch(timeSynced(t));
      }
      if (t < max) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      dispatch(timeSynced(clock.t)); // publish the exact time on pause
    };
  }, [clock, dispatch, playing, speed, max]);

  return clock;
}
