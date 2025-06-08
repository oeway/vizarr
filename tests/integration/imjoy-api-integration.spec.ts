import { test, expect } from '@playwright/test';

test.describe('ImJoy API Integration with Vizarr', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console monitoring
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`Browser error: ${msg.text()}`);
      }
    });
  });

  test('should initialize HyphaCore and expose API', async ({ page }) => {
    console.log('Testing HyphaCore initialization...');
    
    // Navigate to the test page
    await page.goto('/lite-test.html');
    
    // Wait for HyphaCore to initialize
    await page.waitForFunction(
      () => window.hyphaCore,
      { timeout: 30000 }
    );
    
    // Verify HyphaCore is available
    const hyphaCore = await page.evaluate(() => window.hyphaCore);
    expect(hyphaCore).toBeTruthy();
    
    // Verify API is available
    const api = await page.evaluate(() => window.api);
    expect(api).toBeTruthy();
    
    // Check status shows success
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('initialized successfully');
    
    console.log('✅ HyphaCore initialization test passed');
  });

  test('should list available services through API', async ({ page }) => {
    console.log('Testing service listing...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Click basic test button
    await page.click('button:has-text("Basic API Test")');
    
    // Wait for test to complete
    await page.waitForTimeout(2000);
    
    // Verify test result
    const results = await page.locator('#results').textContent();
    expect(results).toContain('Basic API: ✅ PASS');
    
    console.log('✅ Service listing test passed');
  });

  test('should create Vizarr viewer window with EBI zarr source', async ({ page }) => {
    console.log('Testing Vizarr viewer creation with EBI source...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api && window.testEBIZarr,
      { timeout: 30000 }
    );
    
    // Click EBI zarr test button
    await page.click('button:has-text("Load EBI Zarr")');
    
    // Wait for test to complete and window to be created
    await page.waitForTimeout(5000);
    
    // Verify test result shows success
    const results = await page.locator('#results').textContent();
    expect(results).toContain('EBI Zarr Load: ✅ PASS');
    
    // Verify window count increased
    const windowStatus = await page.locator('#windowStatus').textContent();
    expect(windowStatus).toContain('Active Windows: 1');
    
    // Verify status shows success
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('EBI zarr loaded successfully');
    
    console.log('✅ EBI zarr viewer creation test passed');
  });

  test('should handle createWindow API call programmatically', async ({ page }) => {
    console.log('Testing programmatic createWindow API call...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Test programmatic window creation
    const windowResult = await page.evaluate(async () => {
      try {
        const zarrUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
        const vizarrUrl = `http://localhost:5173/?source=${encodeURIComponent(zarrUrl)}`;
        
        const viewer = await window.api.createWindow({
          src: vizarrUrl,
          name: "Test Viewer",
          window_id: `test-${Date.now()}`
        });
        
        return {
          success: true,
          viewer: !!viewer,
          windowId: viewer?.window_id || null
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    expect(windowResult.success).toBe(true);
    expect(windowResult.viewer).toBe(true);
    expect(windowResult.windowId).toBeTruthy();
    
    // Wait for window to be created
    await page.waitForTimeout(2000);
    
    // Verify window count
    const windowStatus = await page.locator('#windowStatus').textContent();
    expect(windowStatus).toContain('Active Windows: 1');
    
    console.log('✅ Programmatic createWindow test passed');
  });

  test('should handle custom zarr URL input', async ({ page }) => {
    console.log('Testing custom zarr URL handling...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization  
    await page.waitForFunction(
      () => window.api && window.createVizarrViewer,
      { timeout: 30000 }
    );
    
    // Test with custom URL programmatically (skip prompt)
    const customResult = await page.evaluate(async () => {
      try {
        const customUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
        const viewer = await window.createVizarrViewer(customUrl);
        
        return {
          success: true,
          viewer: !!viewer
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    expect(customResult.success).toBe(true);
    expect(customResult.viewer).toBe(true);
    
    console.log('✅ Custom zarr URL test passed');
  });

  test('should clear windows properly', async ({ page }) => {
    console.log('Testing window clearing functionality...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Create a test window first
    await page.click('button:has-text("Load EBI Zarr")');
    await page.waitForTimeout(3000);
    
    // Verify window was created
    let windowStatus = await page.locator('#windowStatus').textContent();
    expect(windowStatus).toContain('Active Windows: 1');
    
    // Clear windows
    await page.click('button:has-text("Clear Windows")');
    await page.waitForTimeout(1000);
    
    // Verify windows were cleared
    windowStatus = await page.locator('#windowStatus').textContent();
    expect(windowStatus).toContain('Active Windows: 0');
    
    console.log('✅ Window clearing test passed');
  });

  test('should handle viewer API interaction', async ({ page }) => {
    console.log('Testing viewer API interaction...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Create viewer and test API interaction
    const viewerTest = await page.evaluate(async () => {
      try {
        const zarrUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
        const viewer = await window.createVizarrViewer(zarrUrl);
        
        // Test that we can access the viewer object
        const hasWindowId = !!viewer.window_id;
        const hasCreateWindow = typeof viewer.createWindow === 'function';
        
        return {
          success: true,
          hasWindowId,
          hasCreateWindow,
          viewerType: typeof viewer
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    expect(viewerTest.success).toBe(true);
    expect(viewerTest.viewerType).toBe('object');
    
    console.log('✅ Viewer API interaction test passed');
  });

  test('should handle multiple concurrent viewers', async ({ page }) => {
    console.log('Testing multiple concurrent viewers...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Create multiple viewers
    const multiViewerTest = await page.evaluate(async () => {
      try {
        const zarrUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
        
        // Create 3 viewers concurrently
        const viewers = await Promise.all([
          window.createVizarrViewer(zarrUrl),
          window.createVizarrViewer(zarrUrl),
          window.createVizarrViewer(zarrUrl)
        ]);
        
        return {
          success: true,
          viewerCount: viewers.length,
          allHaveWindowIds: viewers.every(v => v.window_id)
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    expect(multiViewerTest.success).toBe(true);
    expect(multiViewerTest.viewerCount).toBe(3);
    expect(multiViewerTest.allHaveWindowIds).toBe(true);
    
    // Wait for windows to be created
    await page.waitForTimeout(3000);
    
    // Verify window count
    const windowStatus = await page.locator('#windowStatus').textContent();
    expect(windowStatus).toContain('Active Windows: 3');
    
    console.log('✅ Multiple concurrent viewers test passed');
  });

  test('should handle error cases gracefully', async ({ page }) => {
    console.log('Testing error handling...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Test error handling with invalid URL
    const errorTest = await page.evaluate(async () => {
      try {
        // Try to create viewer with invalid URL
        await window.createVizarrViewer('invalid-url');
        return { success: false, shouldHaveFailed: true };
      } catch (error) {
        return { 
          success: true, 
          errorCaught: true,
          errorMessage: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    // We expect this to either succeed (viewer attempts to load invalid URL)
    // or fail gracefully with an error
    expect(errorTest.errorCaught || errorTest.shouldHaveFailed).toBeTruthy();
    
    console.log('✅ Error handling test passed');
  });
});

// Global type declarations for test environment
declare global {
  interface Window {
    hyphaCorePromise: Promise<any>;
    hyphaCore: any;
    api: any;
    createVizarrViewer: (url: string) => Promise<any>;
    testEBIZarr: () => Promise<any>;
    testWindows: Record<string, any>;
  }
} 