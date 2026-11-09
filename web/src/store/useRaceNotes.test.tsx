import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = { sub: "u-ana", name: "Ana", role: "Strategist" as const };
const input = { raceKey: 9839, title: "Undercut window", body: "", category: "Strategy" as const, lap: 18 };
const dto = { ...input, id: "n1", createdAt: "2026-11-10T00:00:00Z", updatedAt: "2026-11-10T00:00:00Z" };

/** Imports the store and hook fresh, after the data mode env var is set (it's read at module load). */
async function setup() {
  vi.resetModules();
  const { makeStore } = await import("./store");
  const { useRaceNotes } = await import("./useRaceNotes");
  const store = makeStore({ auth: { session } });
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  return { store, ...renderHook(() => useRaceNotes(9839), { wrapper }) };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("useRaceNotes in live mode", () => {
  let calls: { method: string; path: string; body: string }[];

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "live");
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        calls.push({ method: request.method, path: new URL(request.url).pathname, body: await request.text() });
        if (request.method === "DELETE") return new Response(null, { status: 204 });
        return Response.json(request.method === "GET" ? [dto] : dto);
      }),
    );
  });

  it("loads the user's notes from the API", async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.notes).toHaveLength(1));
    expect(result.current.storage).toBe("account");
    expect(result.current.notes[0]).toMatchObject({ id: "n1", ownerId: "u-ana", deletedAt: null });
    expect(calls[0]).toMatchObject({ method: "GET", path: "/api/live/races/9839/notes" });
  });

  it("creates, edits and deletes through the API, refetching after each", async () => {
    const { result } = await setup();
    await waitFor(() => expect(result.current.notes).toHaveLength(1));

    await act(() => result.current.add(input));
    await act(() => result.current.update("n1", { lap: 20 }));
    await act(() => result.current.remove("n1"));

    const writes = calls.filter((c) => c.method !== "GET");
    expect(writes).toEqual([
      { method: "POST", path: "/api/live/races/9839/notes", body: JSON.stringify({ title: "Undercut window", body: "", category: "Strategy", lap: 18 }) },
      { method: "PATCH", path: "/api/live/notes/n1", body: JSON.stringify({ lap: 20 }) },
      { method: "DELETE", path: "/api/live/notes/n1", body: "" },
    ]);
    await waitFor(() => expect(calls.filter((c) => c.method === "GET")).toHaveLength(4));
  });

  it("reports a failed request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({}, { status: 403 })));
    const { result } = await setup();
    await waitFor(() => expect(result.current.error).toBe("Your role doesn't include this data."));
  });
});

describe("useRaceNotes in snapshot mode", () => {
  it("keeps notes in the store without calling the API", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { result } = await setup();
    expect(result.current.storage).toBe("device");
    await act(() => result.current.add(input));
    expect(result.current.notes).toMatchObject([{ title: "Undercut window", ownerId: "u-ana" }]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
