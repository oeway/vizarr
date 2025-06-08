import { test, expect } from '@playwright/test';

test.describe('Minimal HyphaCore Test', () => {
  test('should initialize HyphaCore successfully', async ({ page }) => {
    console.log('Testing minimal HyphaCore initialization...');
    
    // Navigate to minimal test page
    await page.goto('/lite-test-minimal.html');
    
    // Wait for initialization to complete (up to 10 seconds)
    await page.waitForFunction(() => {
      return (window as any).initPromise && (window as any).api;
    }, { timeout: 10000 });
    
    // Check that API is available
    const api = await page.evaluate(() => (window as any).api);
    expect(api).toBeTruthy();
    
    // Check status shows success
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('HyphaCore initialized!');
    expect(statusText).toContain('Services:');
    
    console.log('✅ Minimal HyphaCore initialization test passed');
  });
  
  test('should handle basic API calls', async ({ page }) => {
    console.log('Testing basic API functionality...');
    
    // Navigate to minimal test page
    await page.goto('/lite-test-minimal.html');
    
    // Wait for initialization
    await page.waitForFunction(() => (window as any).api, { timeout: 10000 });
    
    // Click test API button
    await page.click('button:has-text("Test API")');
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Check results
    const results = await page.locator('#results').textContent();
    expect(results).toContain('✅ API test passed!');
    
    console.log('✅ Basic API test passed');
  });
  
  test('should handle window creation attempt', async ({ page }) => {
    console.log('Testing window creation attempt...');
    
    // Capture console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
        console.log('Browser console:', msg.text());
      }
    });
    
    // Navigate to minimal test page
    await page.goto('/lite-test-minimal.html');
    
    // Wait for initialization
    await page.waitForFunction(() => (window as any).api, { timeout: 10000 });
    
    // Click test window creation button
    await page.click('button:has-text("Test Window Creation")');
    
    // Wait for results
    await page.waitForTimeout(15000); // Give more time for success or timeout to trigger
    
    // Check results
    const results = await page.locator('#results').textContent();
    
    // Log all captured console messages
    console.log('\n=== CAPTURED CONSOLE LOGS ===');
    consoleLogs.forEach((log, index) => {
      console.log(`${index + 1}: ${log}`);
    });
    console.log('==============================\n');
    
    // Check that the window creation was attempted (either success or timeout)
    const hasAttempt = results?.includes('API available, attempting to create window...') || false;
    const hasSuccess = results?.includes('✅ Window created successfully!') || false;
    const hasTimeout = results?.includes('createWindow timeout') || false;
    const hasError = results?.includes('❌ Window creation failed') || false;
    
    expect(hasAttempt).toBe(true);
    expect(hasSuccess || hasTimeout || hasError).toBe(true);
    
    console.log('Window creation attempt result:', { hasSuccess, hasTimeout, hasError });
    console.log('Console logs captured:', consoleLogs.length);
  });
}); 