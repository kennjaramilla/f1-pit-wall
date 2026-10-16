export const ROLES = ["Viewer", "Strategist", "Admin"] as const;
export type Role = (typeof ROLES)[number];

/** Each permission names the lowest role that has it; roles inherit everything below them. */
const PERMISSIONS = {
  "replay:view": "Viewer",
  "telemetry:view": "Strategist",
  "admin:view": "Admin",
} as const satisfies Record<string, Role>;

export type Permission = keyof typeof PERMISSIONS;

export function isRole(value: unknown): value is Role {
  return ROLES.includes(value as Role);
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return role != null && ROLES.indexOf(role) >= ROLES.indexOf(PERMISSIONS[permission]);
}

export function requiredRole(permission: Permission): Role {
  return PERMISSIONS[permission];
}

/** Permission a request path needs, or null when the path is public. */
export function permissionForPath(pathname: string): Permission | null {
  if (pathname === "/login" || pathname === "/forbidden" || pathname.startsWith("/api/auth/")) return null;
  if (pathname.startsWith("/admin")) return "admin:view";
  if (/^\/data\/races\/\d+\/telemetry/.test(pathname) || /^\/api\/live\/races\/\d+\/telemetry/.test(pathname)) return "telemetry:view";
  return "replay:view";
}
