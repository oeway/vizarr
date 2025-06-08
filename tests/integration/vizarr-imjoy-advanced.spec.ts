import { test, expect } from '@playwright/test';

test.describe('Advanced Vizarr ImJoy API Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console monitoring for debugging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`Browser error: ${msg.text()}`);
      }
    });
  });

  test('should create viewer and test communication patterns', async ({ page }) => {
    console.log('Testing advanced viewer communication...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api && window.createVizarrViewer,
      { timeout: 30000 }
    );
    
    // Test communication patterns
    const communicationTest = await page.evaluate(async () => {
      try {
        const zarrUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
        const viewer = await window.createVizarrViewer(zarrUrl);
        
        // Test viewer properties
        const hasWindowId = 'window_id' in viewer;
        const windowIdType = typeof viewer.window_id;
        
        // Test if viewer is a function (API proxy)
        const isFunction = typeof viewer === 'function';
        const isObject = typeof viewer === 'object';
        
        return {
          success: true,
          hasWindowId,
          windowIdType,
          isFunction,
          isObject,
          viewerKeys: Object.keys(viewer || {}),
          viewerProto: viewer ? Object.getPrototypeOf(viewer).constructor.name : null
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    expect(communicationTest.success).toBe(true);
    console.log('Viewer structure:', communicationTest);
    
    console.log('✅ Advanced viewer communication test passed');
  });

  test('should handle viewer method calls through ImJoy API', async ({ page }) => {
    console.log('Testing viewer method calls...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Test viewer method calls
    const methodTest = await page.evaluate(async () => {
      try {
        const zarrUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
        const viewer = await window.createVizarrViewer(zarrUrl);
        
        // Test calling viewer methods (these might not exist yet, but test the pattern)
        const tests = [];
        
        // Test if viewer can be called as function (ImJoy pattern)
        if (typeof viewer === 'function') {
          tests.push({ method: 'function_call', supported: true });
        }
        
        // Test common viewer methods that might be available
        const commonMethods = ['getImage', 'setImage', 'refresh', 'resize', 'close'];
        for (const method of commonMethods) {
          if (viewer && typeof viewer[method] === 'function') {
            tests.push({ method, supported: true });
          } else {
            tests.push({ method, supported: false });
          }
        }
        
        return {
          success: true,
          tests,
          viewerType: typeof viewer,
          hasWindowId: !!viewer?.window_id
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    expect(methodTest.success).toBe(true);
    console.log('Method availability:', methodTest.tests);
    
    console.log('✅ Viewer method calls test passed');
  });

  test('should test viewer lifecycle management', async ({ page }) => {
    console.log('Testing viewer lifecycle...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Test viewer lifecycle
    const lifecycleTest = await page.evaluate(async () => {
      try {
        const zarrUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
        
        // Create viewer
        const viewer1 = await window.createVizarrViewer(zarrUrl);
        const windowId1 = viewer1?.window_id;
        
        // Create second viewer
        const viewer2 = await window.createVizarrViewer(zarrUrl);
        const windowId2 = viewer2?.window_id;
        
        // Verify they have different window IDs
        const hasDifferentIds = windowId1 !== windowId2;
        
        // Check window tracking
        const windowCount = window.testWindows ? Object.keys(window.testWindows).length : 0;
        
        return {
          success: true,
          viewer1Id: windowId1,
          viewer2Id: windowId2,
          hasDifferentIds,
          windowCount,
          bothViewersExist: !!viewer1 && !!viewer2
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    expect(lifecycleTest.success).toBe(true);
    expect(lifecycleTest.hasDifferentIds).toBe(true);
    expect(lifecycleTest.bothViewersExist).toBe(true);
    
    console.log('Lifecycle test results:', lifecycleTest);
    console.log('✅ Viewer lifecycle test passed');
  });

  test('should test viewer window integration', async ({ page }) => {
    console.log('Testing viewer window integration...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Create viewer and test window integration
    await page.evaluate(async () => {
      const zarrUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
      await window.createVizarrViewer(zarrUrl);
    });
    
    // Wait for window to be created
    await page.waitForTimeout(3000);
    
    // Verify window status updated
    const windowStatus = await page.locator('#windowStatus').textContent();
    expect(windowStatus).toContain('Active Windows: 1');
    
    // Test that we can access window elements (basic check)
    const windowExists = await page.evaluate(() => {
      return window.testWindows && Object.keys(window.testWindows).length > 0;
    });
    
    expect(windowExists).toBe(true);
    
    console.log('✅ Viewer window integration test passed');
  });

  test('should test API error handling and recovery', async ({ page }) => {
    console.log('Testing API error handling...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Test various error scenarios
    const errorHandlingTest = await page.evaluate(async () => {
      const results = [];
      
      try {
        // Test 1: Invalid zarr URL
        try {
          await window.createVizarrViewer('not-a-url');
          results.push({ test: 'invalid_url', result: 'unexpected_success' });
        } catch (error) {
          results.push({ test: 'invalid_url', result: 'expected_error' });
        }
        
        // Test 2: Empty URL
        try {
          await window.createVizarrViewer('');
          results.push({ test: 'empty_url', result: 'unexpected_success' });
        } catch (error) {
          results.push({ test: 'empty_url', result: 'expected_error' });
        }
        
        // Test 3: Null parameter
        try {
          await window.createVizarrViewer(null as any);
          results.push({ test: 'null_param', result: 'unexpected_success' });
        } catch (error) {
          results.push({ test: 'null_param', result: 'expected_error' });
        }
        
        // Test 4: Valid URL should still work after errors
        try {
          const zarrUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
          const viewer = await window.createVizarrViewer(zarrUrl);
          results.push({ 
            test: 'recovery_test', 
            result: viewer ? 'success' : 'failed',
            hasWindowId: !!viewer?.window_id
          });
        } catch (error) {
          results.push({ test: 'recovery_test', result: 'failed_recovery' });
        }
        
        return { success: true, results };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    expect(errorHandlingTest.success).toBe(true);
    
    // Verify recovery test succeeded
    const recoveryTest = errorHandlingTest.results?.find(r => r.test === 'recovery_test');
    expect(recoveryTest?.result).toBe('success');
    
    console.log('Error handling results:', errorHandlingTest.results);
    console.log('✅ API error handling test passed');
  });

  test('should test plugin communication patterns', async ({ page }) => {
    console.log('Testing plugin communication patterns...');
    
    await page.goto('/lite-test.html');
    
    // Wait for initialization
    await page.waitForFunction(
      () => window.api,
      { timeout: 30000 }
    );
    
    // Test communication patterns between main app and plugin
    const communicationTest = await page.evaluate(async () => {
      try {
        // Create viewer
        const zarrUrl = 'https://uk1s3.embassy.ebi.ac.uk/idr/zarr/v0.1/6001253.zarr';
        const viewer = await window.createVizarrViewer(zarrUrl);
        
        // Test if we can set up communication
        const patterns = {
          hasWindowId: !!viewer?.window_id,
          canStringify: true,
          viewerProperties: Object.keys(viewer || {}),
          viewerType: typeof viewer
        };
        
        // Try to stringify viewer (should work for serializable objects)
        try {
          JSON.stringify(viewer);
          patterns.canStringify = true;
        } catch {
          patterns.canStringify = false;
        }
        
        return {
          success: true,
          patterns
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    
    expect(communicationTest.success).toBe(true);
    console.log('Communication patterns:', communicationTest.patterns);
    
    console.log('✅ Plugin communication patterns test passed');
  });
});

// Global type declarations for test environment
declare global {
  interface Window {
    initPromise: Promise<any>;
    hyphaCorePromise: Promise<any>;
    hyphaCore: any;
    api: any;
    createVizarrViewer: (url: string) => Promise<any>;
    loadEBIZarr: () => Promise<any>;
    testWindows: Record<string, any>;
    clearWindows: () => void;
    createTestWindow: () => Promise<any>;
  }
} 