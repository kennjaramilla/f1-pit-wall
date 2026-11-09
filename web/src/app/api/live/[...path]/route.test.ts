import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: "token-123" }) }),
}));

const { DELETE, GET, PATCH } = await import("./route");
const params = (...path: string[]) => ({ params: Promise.resolve({ path }) });

describe("live API proxy", () => {
  let upstream: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("API_URL", "http://api.test/");
    upstream = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", upstream);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("forwards a PATCH with its JSON body and the user's token", async () => {
    const request = new Request("http://web.test/api/live/notes/n1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lap: 20 }),
    });
    const response = await PATCH(request, params("notes", "n1"));
    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledWith("http://api.test/api/notes/n1", {
      method: "PATCH",
      headers: { Authorization: "Bearer token-123", "Content-Type": "application/json" },
      body: '{"lap":20}',
      cache: "no-store",
    });
  });

  it("sends GET and DELETE without a body", async () => {
    upstream.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const deleted = await DELETE(new Request("http://web.test", { method: "DELETE" }), params("notes", "n1"));
    expect(deleted.status).toBe(204);
    await GET(new Request("http://web.test"), params("races", "9839", "notes"));
    for (const [, init] of upstream.mock.calls) {
      expect(init.body).toBeUndefined();
      expect(init.headers).toEqual({ Authorization: "Bearer token-123" });
    }
  });

  it("is 503 when the live API isn't configured", async () => {
    vi.stubEnv("API_URL", "");
    expect((await GET(new Request("http://web.test"), params("races"))).status).toBe(503);
  });
});
