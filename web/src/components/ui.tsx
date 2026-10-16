import { compound } from "@/lib/compounds";
import { boundsOf, outlinePath, projectionFor } from "@/lib/replay";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function Panel({
  title,
  actions,
  children,
  className = "",
  id,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section aria-labelledby={id && title ? `${id}-title` : undefined} className={`rounded-xl border border-border bg-panel ${className}`}>
      {(title || actions) && (
        <div className="flex min-h-11 items-center gap-3 border-b border-border px-4 py-2">
          {title && (
            <h2 id={id ? `${id}-title` : undefined} className="text-sm font-semibold uppercase tracking-wider text-muted">
              {title}
            </h2>
          )}
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-border bg-panel p-8 text-center">
      <div aria-hidden className="text-3xl">
        ⚠
      </div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-40 items-center justify-center p-6 text-center text-sm text-muted">{children}</div>;
}

export function TyreBadge({ name, age, size = "md" }: { name: string | null; age?: number | null; size?: "sm" | "md" }) {
  const c = compound(name);
  const dim = size === "sm" ? "h-5 w-5 text-[11px]" : "h-6 w-6 text-xs";
  return (
    <span className="inline-flex items-center gap-1" title={`${c.label} tyre${age != null ? `, ${age} laps old` : ""}`}>
      <span
        className={`inline-flex ${dim} items-center justify-center rounded-full border-2 font-bold`}
        style={{ borderColor: c.colour, color: c.colour, background: "var(--panel-2)" }}
      >
        {c.letter}
      </span>
      <span className="sr-only">{c.label}</span>
      {age != null && <span className="tabular text-xs text-muted">{age}</span>}
    </span>
  );
}

export function TrackOutline({
  points,
  className = "",
  stroke = "currentColor",
}: {
  points: number[][];
  className?: string;
  stroke?: string;
}) {
  if (points.length < 3) return null;
  const project = projectionFor(points);
  const b = boundsOf(points, 0.06, project);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  return (
    <svg viewBox={`${b.minX} ${b.minY} ${w} ${h}`} className={className} aria-hidden>
      <path
        d={outlinePath(points, project)}
        fill="none"
        stroke={stroke}
        strokeWidth={Math.max(w, h) / 45}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-border-strong bg-panel-2 px-1.5 py-0.5 font-mono text-xs">
      {children}
    </kbd>
  );
}
