"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppStore } from "@/store/hooks";
import { SPEEDS, paused, played, seeked, selectionCleared, speedChanged } from "@/store/replaySlice";
import type { LapStart } from "./types";

/** Global replay shortcuts; ignored while typing in form fields or inside dialogs. */
export function useShortcuts(lapStarts: LapStart[], onHelp: () => void): void {
  const store = useAppStore();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, select, textarea, dialog")) return;
      if (e.key === " " && el.closest("button")) return; // a focused button already handles Space
      const { t, min, max, playing } = store.getState().replay;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          dispatch(playing ? paused() : played());
          break;
        case "ArrowLeft":
        case "ArrowRight": {
          if (el.closest("[role=tab]")) return;
          e.preventDefault();
          const forward = e.key === "ArrowRight";
          if (!e.shiftKey) return void dispatch(seeked(t + (forward ? 10_000 : -10_000)));
          const target = forward ? lapStarts.find((l) => l.t > t + 500) : lapStarts.findLast((l) => l.t < t - 1500);
          dispatch(seeked(target?.t ?? (forward ? max : min)));
          break;
        }
        case "Escape":
          dispatch(selectionCleared());
          break;
        case "?":
          onHelp();
          break;
        default: {
          const n = Number(e.key);
          if (n >= 1 && n <= SPEEDS.length) dispatch(speedChanged(SPEEDS[n - 1]));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [store, dispatch, lapStarts, onHelp]);
}
