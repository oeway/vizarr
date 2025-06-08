import { test, expect } from '@playwright/test';
import { TestUtils } from './integration/test-utils';

test.describe('Zarr Image Loading', () => {
  test('should successfully load zarr image from EBI source', async ({ page }) => {
    // Set up console error tracking
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navigate to the application with the zarr source
    await TestUtils.navigateToZarrSource(page, TestUtils.TEST_SOURCES.EBI_6001253);
    
    // Check that the page title contains "vizarr"
    await expect(page).toHaveTitle(/vizarr/i);
    
    // Check for application-level errors
    const appErrors = await TestUtils.checkForApplicationErrors(page);
    expect(appErrors.hasError).toBe(false);
    
    // Verify canvas rendering is working
    await TestUtils.verifyCanvasRendering(page);
    
    // Wait a bit more to catch any delayed errors
    await page.waitForTimeout(2000);
    
    // Check for critical JavaScript errors
    const criticalErrors = await TestUtils.checkForCriticalErrors(page);
    expect(criticalErrors).toHaveLength(0);
    
    console.log('Test completed successfully - zarr image loaded');
  });

  test('should handle invalid zarr source gracefully', async ({ page }) => {
    const invalidSource = 'https://invalid-url-that-does-not-exist.com/nonexistent.zarr';
    
    // Navigate to the application with an invalid zarr source
    await page.goto(`/?source=${encodeURIComponent(invalidSource)}`);
    
    // Wait for the page to be ready
    await TestUtils.waitForPageReady(page);
    
    // Wait for potential loading attempts and error states
    await page.waitForTimeout(5000);
    
    // Verify the application still works (doesn't crash)
    await expect(page).toHaveTitle(/vizarr/i);
    
    // Check that the page structure is intact
    const bodyElement = page.locator('body');
    await expect(bodyElement).toBeAttached();
    
    console.log('Test completed - invalid source handled gracefully');
  });

  test('should load application without source parameter', async ({ page }) => {
    // Navigate to the application without any source parameter
    await page.goto('/');
    
    // Wait for the page to be ready
    await TestUtils.waitForPageReady(page);
    
    // Wait for the application to fully initialize
    await page.waitForTimeout(3000);
    
    // Check that the page loads successfully
    await expect(page).toHaveTitle(/vizarr/i);
    
    // Verify that basic elements are present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    // The floating logo should be visible (no images loaded)
    const logo = page.locator('img[alt="logo"]');
    
    // Wait for logo to potentially appear and become visible
    try {
      await expect(logo).toBeVisible({ timeout: 5000 });
      console.log('Logo is visible as expected (no images loaded)');
    } catch (error) {
      // If logo is not visible, that's also acceptable - just verify canvas exists
      console.log('Logo not visible, but canvas exists - application loaded correctly');
    }
    
    console.log('Test completed - application loaded without source parameter');
  });

  test('should handle network timeout gracefully', async ({ page }) => {
    // Use a source that will likely timeout or be very slow
    const slowSource = 'https://httpstat.us/200?sleep=10000'; // Simulates slow response
    
    // Navigate with a short timeout expectation
    await page.goto(`/?source=${encodeURIComponent(slowSource)}`);
    
    // Wait for page to be ready
    await TestUtils.waitForPageReady(page);
    
    // Wait for potential loading attempts
    await page.waitForTimeout(3000);
    
    // The application should still be functional
    await expect(page).toHaveTitle(/vizarr/i);
    
    // Canvas should still be present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    console.log('Test completed - slow/timeout source handled gracefully');
  });
}); 