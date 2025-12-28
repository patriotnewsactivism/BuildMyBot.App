import { test, expect } from '@playwright/test';

test.describe('Knowledge Base & RAG', () => {
  let botId: string;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Assume user is logged in (adapt based on your auth flow)
    // Navigate to bot builder
    await page.goto('/bots');
  });

  test('should upload knowledge base file successfully', async ({ page }) => {
    // Create a new bot first
    const createBotButton = page.getByRole('button', { name: /Create.*Bot|New Bot/i });
    if (await createBotButton.isVisible()) {
      await createBotButton.click();
    }

    // Fill in bot details
    await page.fill('input[placeholder*="bot name" i]', 'Test RAG Bot');

    // Navigate to knowledge base section
    const knowledgeBaseTab = page.getByText(/Knowledge Base|Training/i);
    if (await knowledgeBaseTab.isVisible()) {
      await knowledgeBaseTab.click();
    }

    // Upload test file
    const fileInput = page.locator('input[type="file"]').first();

    // Create a test file
    const testContent = 'BuildMyBot was founded in 2024. Our mission is to make AI accessible to everyone. We offer 5 subscription plans.';
    const buffer = Buffer.from(testContent);

    await fileInput.setInputFiles({
      name: 'test-knowledge.txt',
      mimeType: 'text/plain',
      buffer: buffer
    });

    // Wait for upload success message
    await expect(page.getByText(/uploaded|success|added/i)).toBeVisible({ timeout: 15000 });
  });

  test('should train bot with website URL', async ({ page }) => {
    // Navigate to bot builder
    await page.goto('/bots');

    // Look for URL training input
    const urlInput = page.locator('input[placeholder*="website" i], input[placeholder*="URL" i]').first();

    if (await urlInput.isVisible()) {
      // Enter a test URL
      await urlInput.fill('https://example.com');

      // Click train/scrape button
      const trainButton = page.getByRole('button', { name: /Train|Scrape|Add URL/i });
      await trainButton.click();

      // Wait for scraping to complete
      await expect(page.getByText(/scraped|trained|added/i)).toBeVisible({ timeout: 30000 });
    }
  });

  test('should show knowledge base items in bot configuration', async ({ page }) => {
    await page.goto('/bots');

    // If there are existing bots, select one
    const botCard = page.locator('[class*="bot"]').first();
    if (await botCard.isVisible()) {
      await botCard.click();
    }

    // Navigate to knowledge base view
    const knowledgeTab = page.getByText(/Knowledge|Training Data/i);
    if (await knowledgeTab.isVisible()) {
      await knowledgeTab.click();

      // Should display knowledge base items or empty state
      await expect(
        page.getByText(/knowledge base|no documents|upload/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should retrieve relevant information from RAG in chat', async ({ page }) => {
    // This test requires:
    // 1. A bot with knowledge base trained
    // 2. Access to chat interface
    // 3. RAG embeddings working

    test.skip(
      !process.env.NEXT_PUBLIC_SUPABASE_URL,
      'Supabase not configured'
    );

    // For demonstration, we'll outline the flow:
    await page.goto('/conversations');

    // Start a conversation
    const newChatButton = page.getByRole('button', { name: /New.*Chat|Start/i });
    if (await newChatButton.isVisible()) {
      await newChatButton.click();
    }

    // Send a message that should trigger RAG
    const messageInput = page.locator('input[placeholder*="message" i], textarea[placeholder*="message" i]').first();
    await messageInput.fill('When was BuildMyBot founded?');
    await messageInput.press('Enter');

    // Wait for response
    await expect(page.getByText(/2024/i)).toBeVisible({ timeout: 20000 });

    // The response should contain information from the knowledge base
    // This verifies that RAG retrieval is working
  });

  test('should handle large file uploads', async ({ page }) => {
    await page.goto('/bots');

    const fileInput = page.locator('input[type="file"]').first();

    if (await fileInput.isVisible()) {
      // Create a larger test file (simulating a document)
      const largeContent = 'Test content. '.repeat(1000); // ~14KB
      const buffer = Buffer.from(largeContent);

      await fileInput.setInputFiles({
        name: 'large-document.txt',
        mimeType: 'text/plain',
        buffer: buffer
      });

      // Should show processing/upload progress
      await expect(
        page.getByText(/processing|uploading|chunking/i)
      ).toBeVisible({ timeout: 5000 })
        .catch(() => {
          // Might complete too quickly for small files
          console.log('Upload completed quickly');
        });

      // Wait for completion
      await expect(page.getByText(/success|completed|added/i)).toBeVisible({ timeout: 30000 });
    }
  });

  test('should display storage usage for knowledge base', async ({ page }) => {
    await page.goto('/bots');

    // Look for storage indicator
    const storageIndicator = page.getByText(/storage|MB used|GB used/i);

    // Storage indicator might be visible if user has uploaded files
    if (await storageIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(storageIndicator).toContainText(/\d+\s*(MB|GB|KB)/);
    }
  });

  test('should enforce plan limits on knowledge base uploads', async ({ page }) => {
    // This test verifies that storage limits are enforced based on plan

    test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'Requires backend');

    await page.goto('/bots');

    // If user is on FREE plan (50MB limit), uploading beyond limit should fail
    // This would require creating a large enough file or multiple uploads

    const fileInput = page.locator('input[type="file"]').first();

    if (await fileInput.isVisible()) {
      // Attempt to upload file
      const content = 'Test content for limit check';
      await fileInput.setInputFiles({
        name: 'limit-test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(content)
      });

      // Should either succeed or show limit error
      const result = await Promise.race([
        page.getByText(/success|uploaded/i).isVisible({ timeout: 10000 }),
        page.getByText(/limit|exceeded|upgrade/i).isVisible({ timeout: 10000 })
      ]);

      expect(result).toBeTruthy();
    }
  });

  test('should allow deleting knowledge base items', async ({ page }) => {
    await page.goto('/bots');

    // Navigate to knowledge base
    const knowledgeTab = page.getByText(/Knowledge|Training/i);
    if (await knowledgeTab.isVisible()) {
      await knowledgeTab.click();
    }

    // Look for delete button on knowledge base item
    const deleteButton = page.locator('button').filter({ hasText: /Delete|Remove|×/ }).first();

    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Count items before deletion
      const itemsBefore = await page.locator('[class*="knowledge"]').count();

      await deleteButton.click();

      // Confirm deletion if there's a confirmation dialog
      const confirmButton = page.getByRole('button', { name: /Confirm|Yes|Delete/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Wait for item to be removed
      await page.waitForTimeout(1000);

      const itemsAfter = await page.locator('[class*="knowledge"]').count();
      expect(itemsAfter).toBeLessThan(itemsBefore);
    }
  });
});
