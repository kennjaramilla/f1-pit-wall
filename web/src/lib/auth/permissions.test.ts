import { describe, expect, it } from "vitest";
import { can, isRole, permissionForPath, requiredRole } from "./permissions";

describe("permissions", () => {
  it("lets higher roles inherit lower roles' permissions", () => {
    expect(can("Viewer", "replay:view")).toBe(true);
    expect(can("Viewer", "telemetry:view")).toBe(false);
    expect(can("Strategist", "telemetry:view")).toBe(true);
    expect(can("Strategist", "admin:view")).toBe(false);
    expect(can("Admin", "admin:view")).toBe(true);
    expect(can(null, "replay:view")).toBe(false);
  });

  it("names the minimum role for a permission", () => {
    expect(requiredRole("telemetry:view")).toBe("Strategist");
  });

  it("validates role claims", () => {
    expect(isRole("Admin")).toBe(true);
    expect(isRole("root")).toBe(false);
  });

  it("maps request paths to permissions", () => {
    expect(permissionForPath("/login")).toBeNull();
    expect(permissionForPath("/api/auth/login")).toBeNull();
    expect(permissionForPath("/")).toBe("replay:view");
    expect(permissionForPath("/race/9839")).toBe("replay:view");
    expect(permissionForPath("/data/races/9839/replay.json")).toBe("replay:view");
    expect(permissionForPath("/data/races/9839/telemetry/1.json")).toBe("telemetry:view");
    expect(permissionForPath("/api/live/races/9839/telemetry/1")).toBe("telemetry:view");
    expect(permissionForPath("/admin")).toBe("admin:view");
  });
});
