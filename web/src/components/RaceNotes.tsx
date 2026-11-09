"use client";

import { useRef, useState } from "react";
import type { NoteDraft } from "@/lib/notes";
import type { RaceModel } from "@/lib/race";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { seeked } from "@/store/replaySlice";
import { selectCurrentLap } from "@/store/selectors";
import { useRaceNotes } from "@/store/useRaceNotes";
import { NoteForm } from "./NoteForm";

type Mode = { kind: "list" } | { kind: "create" } | { kind: "edit"; id: string };

export function RaceNotes({ model }: { model: RaceModel }) {
  const raceKey = model.bundle.race.sessionKey;
  const { notes, storage, loading, error, add, update, remove } = useRaceNotes(raceKey);
  const lap = useAppSelector(selectCurrentLap);
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [confirming, setConfirming] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);

  // Return focus to whatever opened the form.
  const close = () => {
    setMode({ kind: "list" });
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const open = (next: Mode, el: HTMLButtonElement) => {
    trigger.current = el;
    setMode(next);
  };
  const toFields = (d: NoteDraft) => ({ title: d.title.trim(), body: d.body.trim(), category: d.category, lap: Number(d.lap) });
  const seekLap = (n: number) => {
    const start = model.bundle.lapStarts.find((l) => l.lap === n);
    if (start) dispatch(seeked(start.t));
  };
  const editing = mode.kind === "edit" ? notes.find((n) => n.id === mode.id) : undefined;

  return (
    <div className="px-4 pb-4" data-cy="race-notes">
      <div className="flex flex-wrap items-center gap-3 py-3">
        <p className="text-xs text-muted">
          {storage === "account"
            ? "Notes are saved to your account and visible only to you."
            : "Demo mode: notes are stored on this device and visible only to you."}
        </p>
        {mode.kind === "list" && (
          <button
            type="button"
            onClick={(e) => open({ kind: "create" }, e.currentTarget)}
            className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white"
            data-cy="note-add"
          >
            + Add note at lap {lap}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-md border border-red/40 px-3 py-2 text-sm text-red" data-cy="notes-error">
          {error}
        </p>
      )}

      {mode.kind === "create" && (
        <NoteForm
          initial={{ title: "", body: "", category: "Strategy", lap: String(lap) }}
          totalLaps={model.totalLaps}
          submitLabel="Save note"
          onCancel={close}
          onSubmit={(d) => {
            add({ raceKey, ...toFields(d) });
            close();
          }}
        />
      )}
      {editing && (
        <NoteForm
          key={editing.id}
          initial={{ title: editing.title, body: editing.body, category: editing.category, lap: String(editing.lap) }}
          totalLaps={model.totalLaps}
          submitLabel="Save changes"
          onCancel={close}
          onSubmit={(d) => {
            update(editing.id, toFields(d));
            close();
          }}
        />
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Loading your notes…</p>
      ) : notes.length === 0 && mode.kind === "list" ? (
        <p className="py-8 text-center text-sm text-muted">No notes for this race yet. Pause on a moment that matters and add one.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border" aria-label="Your notes">
          {notes.map((n) => (
            <li key={n.id} className="flex flex-wrap items-start gap-3 py-3" data-cy="note-item">
              <button
                type="button"
                onClick={() => seekLap(n.lap)}
                className="tabular rounded border border-border px-2 py-0.5 font-mono text-xs hover:bg-panel-2"
                aria-label={`Jump to lap ${n.lap}`}
              >
                L{n.lap}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {n.title} <span className="ml-1 rounded bg-panel-3 px-1.5 py-0.5 text-[11px] font-normal text-muted">{n.category}</span>
                </p>
                {n.body && <p className="mt-0.5 whitespace-pre-line text-sm text-muted">{n.body}</p>}
              </div>
              {confirming === n.id ? (
                <span className="flex items-center gap-2 text-sm" role="group" aria-label={`Delete ${n.title}?`}>
                  Delete?
                  <button
                    type="button"
                    autoFocus
                    onClick={() => {
                      remove(n.id);
                      setConfirming(null);
                    }}
                    className="rounded-md bg-red px-2.5 py-1 text-xs font-semibold text-black"
                    data-cy="note-delete-confirm"
                  >
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} className="rounded-md border border-border px-2.5 py-1 text-xs">
                    Keep
                  </button>
                </span>
              ) : (
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => open({ kind: "edit", id: n.id }, e.currentTarget)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-panel-2"
                    data-cy="note-edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(n.id)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-panel-2"
                    data-cy="note-delete"
                  >
                    Delete
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
