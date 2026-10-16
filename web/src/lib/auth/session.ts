import { jwtVerify, SignJWT } from "jose";
import { isRole, type Role } from "./permissions";

export const SESSION_COOKIE = "pw_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;
// Shared with the .NET API, which validates the same token.
const ISSUER = "pit-wall";
const AUDIENCE = "pit-wall-api";

export interface Session {
  sub: string;
  name: string;
  role: Role;
}

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be set (32+ characters)");
  return new TextEncoder().encode(value);
}

export function signSession(session: Session): Promise<string> {
  return new SignJWT({ name: session.name, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

/** Verified session from a token, or null when it's missing, expired or tampered with. */
export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.name !== "string" || !isRole(payload.role)) return null;
    return { sub: payload.sub, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}
