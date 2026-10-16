// @vitest-environment node
import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
});

describe("session tokens", () => {
  it("round-trips a signed session", async () => {
    const token = await signSession({ sub: "u-1", name: "Sam", role: "Strategist" });
    expect(await verifySession(token)).toEqual({ sub: "u-1", name: "Sam", role: "Strategist" });
  });

  it("rejects missing, tampered and foreign tokens", async () => {
    expect(await verifySession(undefined)).toBeNull();
    const token = await signSession({ sub: "u-1", name: "Sam", role: "Viewer" });
    expect(await verifySession(token.slice(0, -2) + "xx")).toBeNull();
    const foreign = await new SignJWT({ role: "Admin", name: "Eve" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u-x")
      .sign(new TextEncoder().encode("another-secret-another-secret-123456"));
    expect(await verifySession(foreign)).toBeNull();
  });

  it("rejects tokens with an unknown role", async () => {
    const forged = await new SignJWT({ role: "Superuser", name: "Eve" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u-x")
      .setIssuer("pit-wall")
      .setAudience("pit-wall-api")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
    expect(await verifySession(forged)).toBeNull();
  });
});
