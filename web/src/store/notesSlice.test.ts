import { describe, expect, it } from "vitest";
import { validateNote } from "@/lib/notes";
import { noteAdded, noteDeleted, notesHydrated, noteUpdated, selectRaceNotes } from "./notesSlice";
import { makeStore } from "./store";

const session = (sub: string) => ({ sub, name: sub, role: "Strategist" as const });
const input = { raceKey: 1, title: "Undercut window", body: "", category: "Strategy" as const, lap: 12 };

describe("notesSlice", () => {
  it("adds, edits and soft-deletes a note", () => {
    const store = makeStore({ auth: { session: session("u-1") } });
    store.dispatch(noteAdded({ ...input, ownerId: "u-1" }));
    const [note] = selectRaceNotes(store.getState(), 1);
    expect(note).toMatchObject({ title: "Undercut window", lap: 12, deletedAt: null });

    store.dispatch(noteUpdated(note.id, { title: "Undercut worked", lap: 14 }));
    expect(selectRaceNotes(store.getState(), 1)[0]).toMatchObject({ title: "Undercut worked", lap: 14 });

    store.dispatch(noteDeleted(note.id));
    expect(selectRaceNotes(store.getState(), 1)).toEqual([]);
    expect(store.getState().notes.entities[note.id].deletedAt).not.toBeNull(); // retained, not removed
  });

  it("only selects the signed-in user's notes for the requested race, sorted by lap", () => {
    const store = makeStore({ auth: { session: session("u-1") } });
    store.dispatch(noteAdded({ ...input, lap: 30, ownerId: "u-1" }));
    store.dispatch(noteAdded({ ...input, lap: 5, ownerId: "u-1" }));
    store.dispatch(noteAdded({ ...input, ownerId: "u-2" }));
    store.dispatch(noteAdded({ ...input, raceKey: 2, ownerId: "u-1" }));
    expect(selectRaceNotes(store.getState(), 1).map((n) => n.lap)).toEqual([5, 30]);
  });

  it("hydrates from storage", () => {
    const store = makeStore({ auth: { session: session("u-1") } });
    const now = new Date().toISOString();
    store.dispatch(notesHydrated([{ ...input, id: "a", ownerId: "u-1", createdAt: now, updatedAt: now, deletedAt: null }]));
    expect(selectRaceNotes(store.getState(), 1)).toHaveLength(1);
  });

  it("persists the user's notes to localStorage", () => {
    localStorage.clear();
    const store = makeStore({ auth: { session: session("u-9") } });
    store.dispatch(noteAdded({ ...input, ownerId: "u-9" }));
    expect(JSON.parse(localStorage.getItem("pitwall:notes:u-9")!)).toHaveLength(1);
  });
});

describe("validateNote", () => {
  const ok = { title: "Pit now", body: "", category: "Tyres" as const, lap: "10" };

  it("accepts a valid draft", () => {
    expect(validateNote(ok, 58)).toEqual({});
  });

  it("requires a title of at most 80 characters and a note of at most 500", () => {
    expect(validateNote({ ...ok, title: "   " }, 58).title).toMatch(/required/);
    expect(validateNote({ ...ok, title: "x".repeat(81) }, 58).title).toMatch(/80/);
    expect(validateNote({ ...ok, body: "x".repeat(501) }, 58).body).toMatch(/500/);
  });

  it("keeps the lap within the race distance", () => {
    for (const lap of ["0", "59", "abc", "", "3.5"]) expect(validateNote({ ...ok, lap }, 58).lap).toBeDefined();
    expect(validateNote({ ...ok, lap: "58" }, 58).lap).toBeUndefined();
  });
});
