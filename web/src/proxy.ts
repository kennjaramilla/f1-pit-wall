import { NextResponse, type NextRequest } from "next/server";
import { can, permissionForPath } from "@/lib/auth/permissions";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

/** Route gating for pages, snapshot data and the live API proxy. UX convenience; the API enforces the same rules. */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const permission = permissionForPath(pathname);
  if (!permission) return NextResponse.next();

  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isData = pathname.startsWith("/data/") || pathname.startsWith("/api/");

  if (!session) {
    if (isData) return NextResponse.json({ title: "Sign in required" }, { status: 401 });
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  if (!can(session.role, permission)) {
    if (isData) return NextResponse.json({ title: "Forbidden" }, { status: 403 });
    return NextResponse.rewrite(new URL("/forbidden", request.url), { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico).*)"],
};
