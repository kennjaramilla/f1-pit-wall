export const NOTE_CATEGORIES = ["Strategy", "Incident", "Tyres"] as const;
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export const TITLE_MAX = 80;
export const BODY_MAX = 500;

export interface Note {
  id: string;
  ownerId: string;
  raceKey: number;
  title: string;
  body: string;
  category: NoteCategory;
  lap: number;
  createdAt: string;
  updatedAt: string;
  /** Soft delete: kept for audit/retention, hidden from the UI. */
  deletedAt: string | null;
}

export interface NoteDraft {
  title: string;
  body: string;
  category: NoteCategory;
  lap: string;
}

export type NoteErrors = Partial<Record<keyof NoteDraft, string>>;

export function validateNote(draft: NoteDraft, totalLaps: number): NoteErrors {
  const errors: NoteErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = "Title is required.";
  else if (title.length > TITLE_MAX) errors.title = `Title must be ${TITLE_MAX} characters or fewer.`;
  if (draft.body.length > BODY_MAX) errors.body = `Note must be ${BODY_MAX} characters or fewer.`;
  if (!NOTE_CATEGORIES.includes(draft.category)) errors.category = "Choose a category.";
  const lap = Number(draft.lap);
  if (!/^\d+$/.test(draft.lap.trim()) || lap < 1 || lap > totalLaps) errors.lap = `Lap must be between 1 and ${totalLaps}.`;
  return errors;
}

export const notesStorageKey = (userId: string) => `pitwall:notes:${userId}`;
