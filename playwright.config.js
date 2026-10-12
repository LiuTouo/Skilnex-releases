import { defineConfig } from "@playwright/test";

const baseURL =
  process.env.SITE_URL || "http://127.0.0.1:4173/Skilnex-releases/";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    browserName: "chromium",
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: process.env.SITE_URL
    ? undefined
    : {
        command: "node scripts/serve.mjs",
        url: baseURL,
        reuseExistingServer: false,
      },
});
