"use client";

import { useId, useState } from "react";
import { BODY_MAX, NOTE_CATEGORIES, TITLE_MAX, validateNote, type NoteCategory, type NoteDraft } from "@/lib/notes";

interface Props {
  initial: NoteDraft;
  totalLaps: number;
  submitLabel: string;
  onSubmit: (draft: NoteDraft) => void;
  onCancel: () => void;
}

const inputClass = "w-full rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text aria-[invalid=true]:border-red";

/** Create/edit form. Errors show once a field is touched; Save stays disabled while anything is invalid. */
export function NoteForm({ initial, totalLaps, submitLabel, onSubmit, onCancel }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof NoteDraft, boolean>>>({});
  const errors = validateNote(draft, totalLaps);
  const valid = Object.keys(errors).length === 0;

  const field = (name: keyof NoteDraft) => ({
    id: `${id}-${name}`,
    value: draft[name],
    onBlur: () => setTouched((t) => ({ ...t, [name]: true })),
    "aria-invalid": Boolean(touched[name] && errors[name]),
    "aria-describedby": touched[name] && errors[name] ? `${id}-${name}-error` : undefined,
  });
  const set = (name: keyof NoteDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [name]: e.target.value }));
  const error = (name: keyof NoteDraft) =>
    touched[name] && errors[name] ? (
      <p id={`${id}-${name}-error`} className="mt-1 text-xs text-red">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form
      noValidate
      data-cy="note-form"
      className="flex flex-col gap-3 rounded-lg border border-border bg-bg/40 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.stopPropagation();
        onCancel();
      }}
    >
      <div>
        <label htmlFor={`${id}-title`} className="mb-1 block text-sm font-semibold">
          Title <span className="font-normal text-muted">(required)</span>
        </label>
        <input
          {...field("title")}
          onChange={set("title")}
          maxLength={TITLE_MAX + 20}
          autoFocus
          className={inputClass}
          data-cy="note-title"
        />
        {error("title")}
      </div>
      <div>
        <label htmlFor={`${id}-body`} className="mb-1 flex text-sm font-semibold">
          Note
          <span className={`ml-auto font-normal tabular ${draft.body.length > BODY_MAX ? "text-red" : "text-muted"}`} aria-live="polite">
            {draft.body.length}/{BODY_MAX}
          </span>
        </label>
        <textarea {...field("body")} onChange={set("body")} rows={3} className={inputClass} data-cy="note-body" />
        {error("body")}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-40 flex-1">
          <label htmlFor={`${id}-category`} className="mb-1 block text-sm font-semibold">
            Category
          </label>
          <select {...field("category")} onChange={set("category")} className={inputClass} data-cy="note-category">
            {NOTE_CATEGORIES.map((c: NoteCategory) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label htmlFor={`${id}-lap`} className="mb-1 block text-sm font-semibold">
            Lap
          </label>
          <input {...field("lap")} onChange={set("lap")} inputMode="numeric" className={inputClass} data-cy="note-lap" />
        </div>
      </div>
      {error("lap")}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          data-cy="note-save"
        >
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}
