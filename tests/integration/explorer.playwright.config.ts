/**
 * Playwright config dedicated to the deployed-explorer e2e test.
 *
 * Differs from the main playwright.config.ts:
 *   - No `webServer:` (we hit the deployed Svamp URL, no local dev server)
 *   - Only chromium project — vizarr WebGL needs Chromium for predictable rendering
 *   - Longer timeout because we wait on real Hypha + Zarr fetches over the WAN
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "explorer-e2e.spec.ts",
  fullyParallel: false,           // serialize — single demo flow, easier to read logs
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-explorer" }]],
  timeout: 240 * 1000,         // big artifacts (>200 GB) need ~60 s for cold-cache .zattrs/.zarray fetches
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1400, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // No webServer — REEF_EXPLORER_URL must point at the deployed instance.
});
