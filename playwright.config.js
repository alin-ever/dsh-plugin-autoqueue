import { defineConfig } from "@playwright/test";

const chromePath = process.env.PLAYWRIGHT_CHROME_PATH;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  timeout: 15_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    launchOptions: chromePath ? { executablePath: chromePath } : {},
  },
  webServer: {
    command: "npm run test:serve",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
