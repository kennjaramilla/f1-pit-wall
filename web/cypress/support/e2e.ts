import "cypress-axe";

// Fail on serious/critical accessibility violations and print what failed.
Cypress.Commands.add("checkA11yStrict", (context?: string) => {
  cy.injectAxe();
  cy.checkA11y(context, { includedImpacts: ["serious", "critical"] }, (violations) => {
    cy.task("log", violations.map((v) => `${v.id}: ${v.help} -> ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`).join("\n"));
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      checkA11yStrict(context?: string): Chainable<void>;
    }
  }
}

export {};
