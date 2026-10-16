describe("role-based access", () => {
  it("sends anonymous visitors to the login page and back after sign-in", () => {
    cy.visit("/race/9839");
    cy.location("pathname").should("eq", "/login");
    cy.get("[data-cy=login-viewer]").click();
    cy.location("pathname").should("eq", "/race/9839");
    cy.get("[data-cy=user-badge]").should("contain", "Viewer");
  });

  it("locks telemetry and admin for viewers", () => {
    cy.login("Viewer");
    cy.visit("/race/9839");
    cy.get("[data-cy=tab-telemetry]").click();
    cy.get("[data-cy=locked-feature]").should("contain", "Requires Strategist role");
    cy.request({ url: "/data/races/9839/telemetry/1.json", failOnStatusCode: false }).its("status").should("eq", 403);
    cy.contains("header a", "Admin").should("not.exist");
    cy.visit("/admin", { failOnStatusCode: false });
    cy.contains("h1", "You don't have access to this page");
  });

  it("gives admins the admin page", () => {
    cy.login("Admin");
    cy.visit("/");
    cy.contains("header a", "Admin").click();
    cy.get("[data-cy=admin-users] tbody tr").should("have.length", 3);
  });

  it("rejects API data requests without a session", () => {
    cy.request({ url: "/data/races.json", failOnStatusCode: false }).its("status").should("eq", 401);
  });
});
