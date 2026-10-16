describe("race picker", () => {
  it("lists cached races and opens a replay", () => {
    cy.visit("/");
    cy.contains("h1", "See the race the way the strategists did.");
    cy.get("[data-cy=race-card]").should("have.length.at.least", 1);
    cy.checkA11yStrict();
    cy.contains("[data-cy=race-card]", "Abu Dhabi Grand Prix").click();
    cy.location("pathname").should("eq", "/race/9839");
    cy.contains("h1", "Abu Dhabi Grand Prix");
  });
});
