import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Session } from "./session";

export async function getSession(): Promise<Session | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
