import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:5173", channel: process.env.CI ? undefined : "msedge", headless: true, viewport: { width: 1440, height: 1000 }, screenshot: "only-on-failure" },
  webServer: { command: "npm start", url: "http://localhost:5173", reuseExistingServer: !process.env.CI },
});
