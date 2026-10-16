import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithStore } from "@/test/render";
import { RacePicker } from "./RacePicker";

afterEach(() => vi.unstubAllGlobals());

const race = {
  sessionKey: 9839,
  year: 2025,
  name: "Abu Dhabi Grand Prix",
  country: "UAE",
  circuit: "Yas Marina Circuit",
  raceStartUtc: "2025-12-07T13:03:27Z",
  totalLaps: 58,
  winner: { number: 1, acronym: "VER", fullName: "Max Verstappen", team: "Red Bull Racing", colour: "4781D7" },
  outline: [
    [0, 0],
    [10, 0],
    [10, 10],
  ],
};

describe("RacePicker", () => {
  it("shows skeletons, then a card per race linking to its replay", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([race])));
    renderWithStore(<RacePicker />);
    expect(screen.getByLabelText("Loading races")).toBeInTheDocument();
    const link = await screen.findByRole("link", { name: /Abu Dhabi Grand Prix/ });
    expect(link).toHaveAttribute("href", "/race/9839");
    expect(screen.getByText("Max Verstappen")).toBeInTheDocument();
  });

  it("shows a retryable error when loading fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    renderWithStore(<RacePicker />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load races");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows an empty state when nothing is cached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
    renderWithStore(<RacePicker />);
    expect(await screen.findByText(/No races cached yet/)).toBeInTheDocument();
  });
});
