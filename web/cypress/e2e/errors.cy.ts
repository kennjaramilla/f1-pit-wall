describe("error states", () => {
  it("explains a missing race and offers a way back", () => {
    cy.intercept("GET", "/data/races/424242.json", { statusCode: 404, body: {} });
    cy.visit("/race/424242");
    cy.get("[role=alert]").should("contain", "Couldn't load this race");
    cy.contains("a", "Back to all races").click();
    cy.location("pathname").should("eq", "/");
  });
});
