import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",

  // The whole loop crosses two roles and two screens, so the steps depend on each
  // other and cannot run in parallel. One worker also means one browser and one
  // shared database, which is what the journey needs.
  fullyParallel: false,
  workers: 1,

  // Chromium only. Firefox and WebKit would triple the download and the CI time,
  // and the point is proving the journey works, not cross-browser support.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  use: {
    baseURL: "http://127.0.0.1:3000",
    // Only kept when a test fails, so a green run leaves nothing behind.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  // Starts the dev server itself and waits for it. reuseExistingServer means a
  // server already running locally is used instead of a second one fighting for
  // port 3000. In CI there is never one, so it always starts its own.
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },

  // Fail fast in CI on a test that hangs, and retry once, because a browser test
  // has more ways to be slow than a rules test does.
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
});
