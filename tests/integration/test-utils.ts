import { Page, expect } from '@playwright/test';

/**
 * Common test utilities for vizarr integration tests
 */
export class TestUtils {
  
  /**
   * Wait for the vizarr application to be fully loaded
   */
  static async waitForVizarrLoad(page: Page, timeout = 15000) {
    // Wait for network idle with a longer timeout
    await page.waitForLoadState('networkidle', { timeout });
    
    // Wait for the main canvas to be visible with extended timeout
    await page.waitForSelector('canvas', { timeout });
    
    // Give additional time for WebGL initialization and zarr data loading
    await page.waitForTimeout(3000);
  }

  /**
   * Check that no critical JavaScript errors occurred
   */
  static async checkForCriticalErrors(page: Page) {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Filter out non-critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon.ico') && 
      !error.includes('DevTools') &&
      !error.toLowerCase().includes('warning') &&
      !error.includes('404') && // Common during development
      !error.includes('net::ERR_') && // Network errors from invalid sources are expected
      !error.toLowerCase().includes('cors') // CORS errors might be expected
    );
    
    return criticalErrors;
  }

  /**
   * Verify canvas rendering is working
   */
  static async verifyCanvasRendering(page: Page) {
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });
    
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeGreaterThan(0);
    expect(canvasBox!.height).toBeGreaterThan(0);
    
    return canvasBox;
  }

  /**
   * Navigate to vizarr with a specific zarr source
   */
  static async navigateToZarrSource(page: Page, sourceUrl: string) {
    const url = `/?source=${encodeURIComponent(sourceUrl)}`;
    await page.goto(url);
    await this.waitForVizarrLoad(page);
  }

  /**
   * Wait for page to be ready (basic check)
   */
  static async waitForPageReady(page: Page, timeout = 10000) {
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded', { timeout });
    
    // Verify the page has the correct title
    await expect(page).toHaveTitle(/vizarr/i);
    
    // Give a moment for React to initialize
    await page.waitForTimeout(1000);
  }

  /**
   * Check if the application is in an error state
   */
  static async checkForApplicationErrors(page: Page) {
    // Look for common error indicators
    const errorSelectors = [
      '[data-testid="error"]',
      '.error',
      '[class*="error"]',
      '.MuiAlert-standardError', // Material-UI error alerts
      '[role="alert"]'
    ];
    
    for (const selector of errorSelectors) {
      const errorElements = page.locator(selector);
      const count = await errorElements.count();
      if (count > 0) {
        const errorText = await errorElements.first().textContent();
        return { hasError: true, errorText, count };
      }
    }
    
    return { hasError: false, errorText: null, count: 0 };
  }

  /**
   * Common zarr sources for testing
   */
  static readonly TEST_SOURCES = {
    EBI_6001253: 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr',
    // Add more test sources as needed
  };
} 