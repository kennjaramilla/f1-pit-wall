import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? "http://localhost:3300",
    viewportWidth: 1440,
    viewportHeight: 900,
    video: false,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on) {
      on("task", { log: (message: string) => (console.log(message), null) });
    },
  },
});
