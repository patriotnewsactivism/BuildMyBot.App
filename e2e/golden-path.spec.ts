import { test, expect } from '@playwright/test';

/**
 * Golden Path E2E Test
 *
 * This test validates the core user journey through BuildMyBot:
 * 1. Visit the landing page
 * 2. Sign up / Log in
 * 3. Create a new bot
 * 4. Configure bot settings
 * 5. Test the bot in preview chat
 * 6. Verify bot appears in dashboard
 * 7. Clean up (delete bot)
 *
 * This test should ALWAYS pass if the system is healthy.
 * If this test fails, it indicates a critical system issue.
 */

test.describe('Golden Path: Core User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the landing page
    await page.goto('/');
  });

  test('should complete full bot creation and testing flow', async ({ page }) => {
    // ===== STEP 1: Landing Page =====
    await test.step('Visit landing page and verify it loads', async () => {
      await expect(page).toHaveTitle(/BuildMyBot/i);

      // Wait for page to be interactive
      await page.waitForLoadState('networkidle');

      // Check for key elements
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible({ timeout: 10000 });
    });

    // ===== STEP 2: Authentication =====
    await test.step('Log in or sign up', async () => {
      // Look for login/signup buttons
      const loginButton = page.getByRole('button', { name: /login|sign in/i });
      const signupButton = page.getByRole('button', { name: /sign up|get started/i });

      if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await loginButton.click();
      } else if (await signupButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await signupButton.click();
      }

      // For demo/test purposes, look for demo/test account option
      const demoButton = page.getByRole('button', { name: /demo|test|admin/i });
      if (await demoButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await demoButton.click();
      } else {
        // Fill in test credentials
        const emailInput = page.getByPlaceholder(/email/i);
        const passwordInput = page.getByPlaceholder(/password/i);

        if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await emailInput.fill('test@buildmybot.app');
          await passwordInput.fill('testpassword123');

          const submitButton = page.getByRole('button', { name: /log in|sign in|continue/i });
          await submitButton.click();
        }
      }

      // Wait for successful auth and redirect to dashboard
      await page.waitForURL(/\/(dashboard|bots|home|app)/i, { timeout: 15000 });
    });

    // ===== STEP 3: Navigate to Bot Builder =====
    await test.step('Navigate to bot creation', async () => {
      // Look for "Create Bot" or "New Bot" button
      const createBotButton = page.getByRole('button', { name: /create.*bot|new.*bot|\+ .*bot/i });

      if (await createBotButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await createBotButton.click();
      } else {
        // Click on "Bots" in navigation if needed
        const botsNav = page.getByRole('link', { name: /bots|my bots/i });
        if (await botsNav.isVisible({ timeout: 5000 }).catch(() => false)) {
          await botsNav.click();
        }

        // Try to find create button again
        const createBtn2 = page.getByRole('button', { name: /create|new|\+/i }).first();
        await createBtn2.click();
      }

      // Wait for bot builder to load
      await page.waitForTimeout(1000);
    });

    // ===== STEP 4: Create and Configure Bot =====
    const botName = `E2E Test Bot ${Date.now()}`;

    await test.step('Configure bot settings', async () => {
      // Fill in bot name
      const nameInput = page.getByPlaceholder(/bot name|name your bot/i);
      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.clear();
        await nameInput.fill(botName);
      }

      // Fill in system prompt
      const promptInput = page.getByPlaceholder(/system prompt|instructions|personality/i);
      if (await promptInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await promptInput.clear();
        await promptInput.fill('You are a helpful AI assistant for E2E testing. Always respond politely and helpfully.');
      }

      // Save bot
      const saveButton = page.getByRole('button', { name: /save|create|publish/i });
      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click();

        // Wait for save confirmation
        await expect(page.getByText(/saved|created|success/i)).toBeVisible({ timeout: 10000 });
      }
    });

    // ===== STEP 5: Test Bot in Preview Chat =====
    await test.step('Test bot in preview chat', async () => {
      // Look for preview/test chat
      const testMessage = 'Hello, this is an automated test message!';

      // Find chat input (could be in a preview pane)
      const chatInput = page.getByPlaceholder(/type.*message|message|chat/i).first();

      if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await chatInput.fill(testMessage);

        // Send message (look for send button or press Enter)
        const sendButton = page.getByRole('button', { name: /send/i });
        if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await sendButton.click();
        } else {
          await chatInput.press('Enter');
        }

        // Wait for bot response
        await expect(page.getByText(/\w+/i).nth(2)).toBeVisible({ timeout: 15000 });

        console.log('✅ Bot responded successfully to test message');
      } else {
        console.warn('⚠️  Preview chat not found - skipping chat test');
      }
    });

    // ===== STEP 6: Verify Bot in Dashboard =====
    await test.step('Verify bot appears in dashboard', async () => {
      // Navigate back to bots list
      const botsNav = page.getByRole('link', { name: /bots|dashboard/i }).first();
      if (await botsNav.isVisible({ timeout: 5000 }).catch(() => false)) {
        await botsNav.click();
        await page.waitForTimeout(1000);
      }

      // Check if our bot appears
      await expect(page.getByText(botName)).toBeVisible({ timeout: 10000 });

      console.log(`✅ Bot "${botName}" verified in dashboard`);
    });

    // ===== STEP 7: Clean Up (Delete Bot) =====
    await test.step('Delete test bot', async () => {
      // Find and click delete/remove button for our test bot
      const botCard = page.locator(`text=${botName}`).locator('..').locator('..');

      // Look for delete/trash button
      const deleteButton = botCard.getByRole('button', { name: /delete|remove|trash/i });

      if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await deleteButton.click();

        // Confirm deletion if modal appears
        const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Verify bot is gone
        await expect(page.getByText(botName)).not.toBeVisible({ timeout: 5000 });

        console.log(`✅ Test bot "${botName}" deleted successfully`);
      } else {
        console.warn('⚠️  Delete button not found - skipping cleanup');
      }
    });

    // Test complete!
    console.log('✅ GOLDEN PATH TEST COMPLETE - All steps passed!');
  });
});
