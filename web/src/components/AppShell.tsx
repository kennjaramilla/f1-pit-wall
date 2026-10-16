import Link from "next/link";
import { can } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/server";
import { dataMode } from "@/store/f1Api";
import { StoreProvider } from "@/store/StoreProvider";

/** Header + store, rendered per request because it depends on the signed-in user. */
export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <StoreProvider session={session}>
      <header className="sticky top-0 z-30 border-b border-border bg-panel/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold uppercase tracking-wide">
            <span aria-hidden className="inline-block h-5 w-1.5 -skew-x-12 bg-accent" />
            <span>Pit Wall</span>
          </Link>
          <span className="hidden text-sm text-muted sm:inline">Race replay &amp; strategy</span>
          {session && can(session.role, "admin:view") && (
            <Link href="/admin" className="text-sm font-semibold text-muted hover:text-text">
              Admin
            </Link>
          )}
          <span
            className="ml-auto hidden rounded border border-border px-2 py-0.5 text-xs uppercase tracking-wider text-muted sm:inline"
            title={dataMode === "live" ? "Data served live by the .NET API" : "Data served from a snapshot exported by the .NET API"}
          >
            {dataMode === "live" ? "Live API" : "Snapshot"}
          </span>
          {session && (
            <div className="ml-auto flex items-center gap-3 sm:ml-0" data-cy="user-badge">
              <span className="text-right text-sm leading-tight">
                <span className="block font-semibold">{session.name}</span>
                <span className="block text-xs text-muted">{session.role}</span>
              </span>
              <form action="/api/auth/logout" method="post">
                <button className="rounded-md border border-border px-2.5 py-1 text-xs text-muted hover:text-text">Sign out</button>
              </form>
            </div>
          )}
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </StoreProvider>
  );
}
