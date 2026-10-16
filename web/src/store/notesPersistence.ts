import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { notesStorageKey, type Note } from "@/lib/notes";
import { noteAdded, noteDeleted, noteUpdated } from "./notesSlice";
import type { RootState } from "./store";

/** Demo persistence: writes the user's notes (including soft-deleted ones) to localStorage after each change. */
export const notesPersistence = createListenerMiddleware();

notesPersistence.startListening({
  matcher: isAnyOf(noteAdded, noteUpdated, noteDeleted),
  effect: (_, api) => {
    const state = api.getState() as RootState;
    const userId = state.auth.session?.sub;
    if (!userId) return;
    const mine = Object.values(state.notes.entities).filter((n) => n.ownerId === userId);
    try {
      localStorage.setItem(notesStorageKey(userId), JSON.stringify(mine));
    } catch {
      // Storage full or blocked (private mode): notes stay in memory for this session.
    }
  },
});

export function loadNotes(userId: string): Note[] {
  try {
    const raw = localStorage.getItem(notesStorageKey(userId));
    return raw ? (JSON.parse(raw) as Note[]).filter((n) => n.ownerId === userId) : [];
  } catch {
    return [];
  }
}
