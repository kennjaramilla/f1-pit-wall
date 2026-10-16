import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorState, TyreBadge } from "./ui";

describe("TyreBadge", () => {
  it("shows the compound letter and an accessible name, not colour alone", () => {
    render(<TyreBadge name="SOFT" age={12} />);
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("Soft")).toHaveClass("sr-only");
    expect(screen.getByTitle("Soft tyre, 12 laps old")).toBeInTheDocument();
  });

  it("falls back for unknown compounds", () => {
    render(<TyreBadge name={null} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("announces the error and offers a retry", () => {
    let retried = false;
    render(<ErrorState title="Oops" message="Nope" onRetry={() => (retried = true)} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Oops");
    screen.getByRole("button", { name: "Try again" }).click();
    expect(retried).toBe(true);
  });
});
