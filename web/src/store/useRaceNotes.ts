import type { NoteInput } from "@/lib/notes";
import {
  dataMode,
  errorMessage,
  useAddNoteMutation,
  useDeleteNoteMutation,
  useRaceNotesQuery,
  useUpdateNoteMutation,
} from "./f1Api";
import { useAppDispatch, useAppSelector } from "./hooks";
import { noteAdded, noteDeleted, noteUpdated, selectRaceNotes } from "./notesSlice";

type Changes = Partial<Omit<NoteInput, "raceKey">>;

/**
 * The signed-in user's notes for a race, wherever they live: the notes API in live mode,
 * the notes slice (persisted to localStorage) in snapshot mode. Components don't need to know which.
 */
export function useRaceNotes(raceKey: number) {
  const live = dataMode === "live";
  const userId = useAppSelector((s) => s.auth.session?.sub);
  const local = useAppSelector((s) => selectRaceNotes(s, raceKey));
  const dispatch = useAppDispatch();

  const remote = useRaceNotesQuery({ raceKey, userId: userId ?? "" }, { skip: !live || !userId });
  const [add, added] = useAddNoteMutation();
  const [update, updated] = useUpdateNoteMutation();
  const [remove, removed] = useDeleteNoteMutation();

  if (!live) {
    return {
      storage: "device" as const,
      notes: local,
      loading: false,
      error: null,
      add: (input: NoteInput) => userId && dispatch(noteAdded({ ...input, ownerId: userId })),
      update: (id: string, changes: Changes) => dispatch(noteUpdated(id, changes)),
      remove: (id: string) => dispatch(noteDeleted(id)),
    };
  }

  const failed = [remote, added, updated, removed].find((r) => r.isError);
  return {
    storage: "account" as const,
    notes: remote.data ?? [],
    loading: remote.isLoading,
    error: failed ? errorMessage(failed.error) : null,
    add: (input: NoteInput) => add(input),
    update: (id: string, changes: Changes) => update({ id, raceKey, changes }),
    remove: (id: string) => remove({ id, raceKey }),
  };
}
