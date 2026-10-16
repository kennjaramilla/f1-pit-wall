import { DEMO_USERS } from "@/lib/auth/users";
import { dataMode } from "@/store/f1Api";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Admin</h1>
      <p className="mt-2 text-muted">Users and roles. Access is checked by the proxy and again by the API.</p>

      <section className="mt-8 overflow-hidden rounded-xl border border-border bg-panel" aria-labelledby="users-title">
        <h2 id="users-title" className="border-b border-border px-4 py-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Users
        </h2>
        <table className="w-full text-sm" data-cy="admin-users">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Name</th>
              <th className="px-4 py-2 font-semibold">Email</th>
              <th className="px-4 py-2 font-semibold">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {DEMO_USERS.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-2">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-panel p-4" aria-labelledby="ingest-title">
        <h2 id="ingest-title" className="font-semibold">
          Re-ingest a race
        </h2>
        <p className="mt-1 text-sm text-muted">
          {dataMode === "live"
            ? "Calls POST /api/races/{key}/ingest on the .NET API (Admin policy)."
            : "Unavailable in snapshot mode: this deployment serves static files exported by the .NET API. Run the API locally to ingest races."}
        </p>
        <button
          disabled
          className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm text-muted disabled:opacity-60"
          title="Requires the live API"
        >
          Re-ingest
        </button>
      </section>
    </div>
  );
}
