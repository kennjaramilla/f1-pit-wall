import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { racePace } from "@/lib/pace";
import { buildRaceModel } from "@/lib/race";
import { makeBundle } from "@/test/fixtures";
import { renderWithStore } from "@/test/render";
import { PaceTable } from "./PaceTable";

describe("PaceTable", () => {
  const model = buildRaceModel(makeBundle());

  it("ranks drivers with clean laps and dashes the rest", () => {
    renderWithStore(<PaceTable model={model} pace={racePace(model)} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("AAA");
    expect(rows[0]).toHaveTextContent("1:30.000");
    expect(rows[0]).toHaveTextContent("FASTEST");
    expect(rows[1]).toHaveTextContent("BBB");
    expect(rows[1]).toHaveTextContent("—");
  });

  it("selects a driver in the shared replay state", async () => {
    const { store } = renderWithStore(<PaceTable model={model} pace={racePace(model)} />);
    await userEvent.click(screen.getByRole("button", { name: /AAA/ }));
    expect(store.getState().replay.selected).toEqual([1]);
    expect(screen.getByRole("button", { name: /AAA/ })).toHaveAttribute("aria-pressed", "true");
  });
});
