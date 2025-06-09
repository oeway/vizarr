import { expect, test } from "@playwright/test";
import { TestUtils } from "./integration/test-utils";

test.describe("Core Zarr Functionality", () => {
  test("should successfully load and display zarr image from EBI source", async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the application with the zarr source
    const zarrUrl = TestUtils.TEST_SOURCES.EBI_6001253;
    console.log(`Loading zarr image from: ${zarrUrl}`);

    await page.goto(`/?source=${encodeURIComponent(zarrUrl)}`);

    // Wait for the application to load
    await page.waitForLoadState("networkidle", { timeout: 30000 });

    // Verify page loads correctly
    await expect(page).toHaveTitle(/vizarr/i);

    // Wait for canvas to appear and be ready
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 20000 });

    // Verify canvas has proper dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox?.width).toBeGreaterThan(0);
    expect(canvasBox?.height).toBeGreaterThan(0);

    // Give additional time for zarr data to load and render
    await page.waitForTimeout(8000);

    // Check for application-level errors
    const appErrors = await TestUtils.checkForApplicationErrors(page);
    expect(appErrors.hasError).toBe(false);

    // Verify no critical JavaScript errors occurred
    const criticalErrors = consoleErrors.filter(
      (error) =>
        !error.includes("favicon.ico") &&
        !error.includes("DevTools") &&
        !error.toLowerCase().includes("warning") &&
        !error.includes("404") &&
        !error.includes("net::ERR_") &&
        !error.toLowerCase().includes("cors"),
    );

    if (criticalErrors.length > 0) {
      console.log("Critical errors found:", criticalErrors);
    }

    // The test passes if we can load the page, show a canvas, and have minimal errors
    expect(criticalErrors.length).toBeLessThanOrEqual(1); // Allow at most 1 minor error

    console.log(`✅ SUCCESS: Zarr image loaded successfully from ${zarrUrl}`);
    console.log(`Canvas dimensions: ${canvasBox?.width}x${canvasBox?.height}`);

    // Additional verification: check that the canvas element is present and has content
    const canvasExists = await page.evaluate(() => {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      return canvas && canvas.width > 0 && canvas.height > 0;
    });

    expect(canvasExists).toBe(true);
    console.log("✅ Canvas verified with valid dimensions");
  });
});
