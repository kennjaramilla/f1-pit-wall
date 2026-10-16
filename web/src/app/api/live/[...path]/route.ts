import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Backend-for-frontend: the browser never sees the token; we attach it here and forward to the .NET API.
async function forward(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return Response.json({ title: "Live API not configured" }, { status: 503 });
  const { path } = await params;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const upstream = await fetch(`${apiUrl.replace(/\/$/, "")}/api/${path.map(encodeURIComponent).join("/")}`, {
    method: request.method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}

export { forward as GET, forward as POST };
