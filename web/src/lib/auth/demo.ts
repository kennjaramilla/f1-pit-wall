import type { Role } from "./permissions";

// Shown on the login page on purpose: these are public demo accounts.
export const DEMO_PASSWORDS: Record<Role, string> = { Viewer: "viewer-demo", Strategist: "strategist-demo", Admin: "admin-demo" };
