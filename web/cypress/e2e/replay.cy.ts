describe("race replay", () => {
  beforeEach(() => {
    cy.visit("/race/9839");
    cy.get("[data-cy=track-map]").should("be.visible");
    cy.get("[data-cy=leaderboard-row]").should("have.length", 20);
  });

  it("plays, pauses and changes speed", () => {
    cy.get("[data-cy=race-clock]").should("contain", "Lap 1/58");
    cy.get("[data-cy=speed-64]").click().should("have.attr", "aria-pressed", "true");
    cy.get("[data-cy=play-toggle]").click().should("have.attr", "aria-label", "Pause replay");
    cy.get("[data-cy=race-clock]", { timeout: 15000 }).should("not.contain", "0:00");
    cy.get("[data-cy=play-toggle]").click().should("have.attr", "aria-label", "Play replay");
  });

  it("scrubs to a lap and keeps the timing tower in sync", () => {
    cy.get("[data-cy=scrubber]").then(($el) => {
      const input = $el[0] as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "1500000");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    cy.get("[data-cy=race-clock]").should("contain", "Lap 17/58");
    cy.get("[data-cy=leaderboard-row]").first().should("contain", "LEADER");
    cy.get("[data-cy=leaderboard]").should("contain", "+");
  });

  it("supports keyboard shortcuts", () => {
    const press = (key: string) => cy.get("body").trigger("keydown", { key });
    press("ArrowRight");
    press("ArrowRight");
    cy.get("[data-cy=race-clock]").should("contain", "0:20");
    press("4");
    cy.get("[data-cy=speed-32]").should("have.attr", "aria-pressed", "true");
    press("?");
    cy.contains("dialog h2", "Keyboard shortcuts").should("be.visible");
    cy.get("dialog button[aria-label=Close]").click();
    cy.get("dialog").should("not.be.visible");
  });

  it("links driver selection across the tower and the map", () => {
    cy.get("[data-cy=leaderboard-row]").first().click().should("have.attr", "aria-pressed", "true");
    cy.contains("button", "Clear selection (1)").click();
    cy.get("[data-cy=leaderboard-row]").first().should("have.attr", "aria-pressed", "false");
  });

  it("switches analysis tabs and compares telemetry", () => {
    cy.get("[data-cy=strategy-chart] svg").should("be.visible");
    cy.get("[data-cy=tab-gaps]").click().should("have.attr", "aria-selected", "true");
    cy.get("[data-cy=gap-chart] path[data-cy^=gap-line]").should("have.length.at.least", 15);
    cy.get("[data-cy=tab-telemetry]").click();
    cy.get("[data-cy=telemetry-driver-0]").should("be.visible");
    cy.get("[data-cy=telemetry-driver-1]").select(2);
    cy.get("[data-cy=telemetry] svg[aria-label='Speed trace by distance']").should("be.visible");
  });

  it("has no serious accessibility violations", () => {
    cy.checkA11yStrict();
  });
});
