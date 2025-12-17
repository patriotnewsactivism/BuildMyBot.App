import { test, expect } from '@playwright/test';

/**
 * Widget Integration Tests
 *
 * Tests the deployable chat widget to ensure it:
 * - Loads correctly on external sites
 * - Doesn't break the host page
 * - Handles errors gracefully
 * - Communicates via postMessage correctly
 */

test.describe('Widget Integration', () => {
  test('widget demo page should load successfully', async ({ page }) => {
    await page.goto('/widget/demo.html');

    // Check page title
    await expect(page).toHaveTitle(/Widget Demo/i);

    // Verify main content is visible
    await expect(page.getByText(/BuildMyBot Widget Demo/i)).toBeVisible();

    // Check that demo controls are present
    await expect(page.getByRole('button', { name: /open widget/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /close widget/i })).toBeVisible();
  });

  test('widget should initialize on demo page', async ({ page }) => {
    await page.goto('/widget/demo.html');

    // Wait for widget to load
    await page.waitForTimeout(2000);

    // Check if chat bubble is present
    const chatBubble = page.locator('#buildmybot-chat-bubble');
    await expect(chatBubble).toBeVisible({ timeout: 10000 });

    console.log('✅ Widget chat bubble loaded successfully');
  });

  test('widget should open when button clicked', async ({ page }) => {
    await page.goto('/widget/demo.html');

    // Wait for widget to load
    await page.waitForTimeout(2000);

    // Click "Open Widget" button
    const openButton = page.getByRole('button', { name: /open widget/i });
    await openButton.click();

    // Wait a moment for animation
    await page.waitForTimeout(1000);

    // Check if iframe is visible
    const iframe = page.locator('#buildmybot-chat-iframe');
    await expect(iframe).toBeVisible({ timeout: 5000 });

    console.log('✅ Widget opened successfully');
  });

  test('widget iframe should load chat interface', async ({ page }) => {
    await page.goto('/widget/demo.html');

    // Wait for widget to load
    await page.waitForTimeout(2000);

    // Open widget
    const openButton = page.getByRole('button', { name: /open widget/i });
    await openButton.click();
    await page.waitForTimeout(1000);

    // Get iframe
    const iframe = page.frameLocator('#buildmybot-chat-iframe');

    // Check for chat elements inside iframe
    const chatInput = iframe.getByPlaceholder(/type.*message/i);
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    console.log('✅ Chat interface loaded inside iframe');
  });

  test('widget should not break host page styles', async ({ page }) => {
    await page.goto('/widget/demo.html');

    // Wait for everything to load
    await page.waitForTimeout(2000);

    // Check that host page elements are still styled correctly
    const header = page.locator('h1').first();
    await expect(header).toBeVisible();

    // Get computed styles to verify they haven't been overridden
    const fontSize = await header.evaluate((el) => window.getComputedStyle(el).fontSize);

    // Header should have meaningful font size (not default)
    expect(parseInt(fontSize)).toBeGreaterThan(24);

    console.log('✅ Host page styles remain intact');
  });

  test('widget should handle JavaScript API calls', async ({ page }) => {
    await page.goto('/widget/demo.html');

    // Wait for widget to load
    await page.waitForTimeout(2000);

    // Call BuildMyBot.open() via JavaScript
    await page.evaluate(() => {
      (window as any).BuildMyBot.open();
    });

    await page.waitForTimeout(1000);

    // Verify iframe is visible
    const iframe = page.locator('#buildmybot-chat-iframe');
    await expect(iframe).toBeVisible();

    // Call BuildMyBot.close()
    await page.evaluate(() => {
      (window as any).BuildMyBot.close();
    });

    await page.waitForTimeout(1000);

    // Verify iframe is hidden
    await expect(iframe).not.toBeVisible();

    console.log('✅ JavaScript API working correctly');
  });

  test('widget should gracefully handle missing bot ID', async ({ page }) => {
    // Create a test page with invalid bot ID
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Test</title></head>
        <body>
          <h1>Test Page</h1>
          <script>
            (function(w,d,b){
              w.BuildMyBot=w.BuildMyBot||{botId:b};
              var s=d.createElement('script');
              s.src='/widget/loader.js';
              s.async=1;
              d.head.appendChild(s);
            })(window,document,'');
          </script>
        </body>
      </html>
    `);

    // Wait to see if widget tries to load
    await page.waitForTimeout(2000);

    // Widget should not crash the page
    const heading = page.getByText('Test Page');
    await expect(heading).toBeVisible();

    // Check console for error (but page should still work)
    const consoleMessages: string[] = [];
    page.on('console', (msg) => consoleMessages.push(msg.text()));

    await page.waitForTimeout(1000);

    // Should log error about missing bot ID
    const hasError = consoleMessages.some((msg) =>
      msg.toLowerCase().includes('no botid') || msg.toLowerCase().includes('error')
    );

    expect(hasError).toBe(true);

    console.log('✅ Widget handles missing bot ID gracefully');
  });
});
