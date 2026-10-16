import { SPEEDS } from "@/store/replaySlice";
import { Kbd } from "./ui";

const ROWS: [string, React.ReactNode][] = [
  [
    "Play / pause",
    <>
      <Kbd>Space</Kbd> or <Kbd>K</Kbd>
    </>,
  ],
  [
    "Seek 10 seconds",
    <>
      <Kbd>←</Kbd> <Kbd>→</Kbd>
    </>,
  ],
  [
    "Previous / next lap",
    <>
      <Kbd>Shift</Kbd> + <Kbd>←</Kbd> <Kbd>→</Kbd>
    </>,
  ],
  [
    "Playback speed",
    <>
      <Kbd>1</Kbd>–<Kbd>{SPEEDS.length}</Kbd> ({SPEEDS.join("×, ")}×)
    </>,
  ],
  ["Clear driver selection", <Kbd key="esc">Esc</Kbd>],
  ["Show this help", <Kbd key="help">?</Kbd>],
];

/** Native <dialog>: focus trapping, Esc to close and the backdrop come for free. */
export function ShortcutsDialog({ ref }: { ref: React.Ref<HTMLDialogElement> }) {
  return (
    <dialog
      ref={ref}
      aria-labelledby="shortcuts-title"
      className="m-auto w-[min(92vw,440px)] rounded-xl border border-border-strong bg-panel p-0 text-text backdrop:bg-black/60"
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="flex items-center border-b border-border px-5 py-3">
        <h2 id="shortcuts-title" className="font-semibold">
          Keyboard shortcuts
        </h2>
        <form method="dialog" className="ml-auto">
          <button className="rounded-md px-2 py-1 text-muted hover:text-text" aria-label="Close">
            ✕
          </button>
        </form>
      </div>
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 px-5 py-4 text-sm">
        {ROWS.map(([label, keys]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right">{keys}</dd>
          </div>
        ))}
      </dl>
    </dialog>
  );
}
