import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/auth/session";
import { DEMO_USERS } from "@/lib/auth/users";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = DEMO_USERS.find((u) => u.email === email);
  // Same response for unknown email and wrong password, so accounts can't be enumerated.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ title: "Invalid email or password" }, { status: 401 });
  }

  const token = await signSession({ sub: user.id, name: user.name, role: user.role });
  const response = NextResponse.json({ name: user.name, role: user.role });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
