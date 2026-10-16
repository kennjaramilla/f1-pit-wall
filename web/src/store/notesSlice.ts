import { createEntityAdapter, createSelector, createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import type { Note, NoteCategory } from "@/lib/notes";
import type { RootState } from "./store";

const adapter = createEntityAdapter<Note>({ sortComparer: (a, b) => a.lap - b.lap || a.createdAt.localeCompare(b.createdAt) });

export interface NoteInput {
  raceKey: number;
  title: string;
  body: string;
  category: NoteCategory;
  lap: number;
}

export const notesSlice = createSlice({
  name: "notes",
  initialState: adapter.getInitialState(),
  reducers: {
    notesHydrated: (state, { payload }: PayloadAction<Note[]>) => adapter.setAll(state, payload),
    noteAdded: {
      reducer: adapter.addOne,
      prepare: (input: NoteInput & { ownerId: string }) => {
        const now = new Date().toISOString();
        return { payload: { ...input, id: nanoid(), createdAt: now, updatedAt: now, deletedAt: null } satisfies Note };
      },
    },
    noteUpdated: {
      reducer: (state, { payload }: PayloadAction<{ id: string; changes: Partial<NoteInput>; at: string }>) =>
        adapter.updateOne(state, { id: payload.id, changes: { ...payload.changes, updatedAt: payload.at } }),
      prepare: (id: string, changes: Partial<NoteInput>) => ({ payload: { id, changes, at: new Date().toISOString() } }),
    },
    noteDeleted: {
      reducer: (state, { payload }: PayloadAction<{ id: string; at: string }>) =>
        adapter.updateOne(state, { id: payload.id, changes: { deletedAt: payload.at } }),
      prepare: (id: string) => ({ payload: { id, at: new Date().toISOString() } }),
    },
  },
});

export const { notesHydrated, noteAdded, noteUpdated, noteDeleted } = notesSlice.actions;

const { selectAll } = adapter.getSelectors((s: RootState) => s.notes);

/** The signed-in user's live notes for one race. */
export const selectRaceNotes = createSelector(
  [selectAll, (s: RootState) => s.auth.session?.sub, (_: RootState, raceKey: number) => raceKey],
  (notes, userId, raceKey) => notes.filter((n) => n.ownerId === userId && n.raceKey === raceKey && n.deletedAt == null),
);
