describe("race notes", () => {
  it("lets a strategist add, edit and delete a note", () => {
    cy.login("Strategist");
    cy.visit("/race/9839");
    cy.get("[data-cy=tab-notes]").click();
    cy.get("[data-cy=note-add]").click();
    cy.get("[data-cy=note-save]").should("be.disabled");
    cy.get("[data-cy=note-lap]").clear().type("99").blur();
    cy.contains("Lap must be between 1 and 58.");
    cy.get("[data-cy=note-lap]").clear().type("23");
    cy.get("[data-cy=note-title]").type("Verstappen pits for hards");
    cy.get("[data-cy=note-body]").type("Covers the undercut.");
    cy.get("[data-cy=note-save]").click();
    cy.get("[data-cy=note-item]").should("have.length", 1).and("contain", "L23");
    cy.get("[data-cy=note-markers] button").should("have.length", 1);

    cy.get("[data-cy=note-edit]").click();
    cy.get("[data-cy=note-title]").should("have.value", "Verstappen pits for hards").clear().type("VER pits lap 23");
    cy.get("[data-cy=note-save]").click();
    cy.get("[data-cy=note-item]").should("contain", "VER pits lap 23");

    cy.get("[data-cy=note-delete]").click();
    cy.get("[data-cy=note-delete-confirm]").click();
    cy.get("[data-cy=note-item]").should("not.exist");
  });

  it("shows viewers a locked state", () => {
    cy.login("Viewer");
    cy.visit("/race/9839");
    cy.get("[data-cy=tab-notes]").click();
    cy.get("[data-cy=locked-feature]").should("contain", "Requires Strategist role");
  });
});
