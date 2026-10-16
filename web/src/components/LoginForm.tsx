"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ROLES, type Role } from "@/lib/auth/permissions";
import { DEMO_PASSWORDS } from "@/lib/auth/demo";

const ROLE_BLURB: Record<Role, string> = {
  Viewer: "Replay, timing tower, strategy and gaps",
  Strategist: "Everything a Viewer has, plus telemetry",
  Admin: "Everything, plus user management",
};

export function LoginForm() {
  const next = useSearchParams().get("next");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Role | null>(null);

  async function signIn(role: Role) {
    setBusy(role);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${role.toLowerCase()}@pitwall.dev`, password: DEMO_PASSWORDS[role] }),
    });
    if (!res.ok) {
      setBusy(null);
      return setError("Sign-in failed. Please try again.");
    }
    // Only follow same-site relative paths to avoid open redirects.
    window.location.assign(next?.startsWith("/") && !next.startsWith("//") ? next : "/");
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      {ROLES.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => signIn(role)}
          disabled={busy != null}
          data-cy={`login-${role.toLowerCase()}`}
          className="flex flex-col items-start rounded-xl border border-border bg-panel p-4 text-left transition hover:border-border-strong hover:bg-panel-2 disabled:opacity-60"
        >
          <span className="font-semibold">{busy === role ? "Signing in…" : `Sign in as ${role}`}</span>
          <span className="text-sm text-muted">{ROLE_BLURB[role]}</span>
          <span className="mt-1 font-mono text-xs text-faint">
            {role.toLowerCase()}@pitwall.dev / {DEMO_PASSWORDS[role]}
          </span>
        </button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      )}
    </div>
  );
}
