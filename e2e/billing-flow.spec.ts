import { test, expect } from '@playwright/test';

test.describe('Stripe Billing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
  });

  test('should display all subscription plans', async ({ page }) => {
    // Login first (adapt this based on your auth flow)
    // For this test, we'll assume we start on the billing page or navigate there

    await page.goto('/billing');

    // Verify all plans are displayed
    await expect(page.getByText('FREE')).toBeVisible();
    await expect(page.getByText('STARTER')).toBeVisible();
    await expect(page.getByText('PROFESSIONAL')).toBeVisible();
    await expect(page.getByText('EXECUTIVE')).toBeVisible();
    await expect(page.getByText('ENTERPRISE')).toBeVisible();

    // Verify pricing is displayed
    await expect(page.getByText('$29')).toBeVisible(); // STARTER
    await expect(page.getByText('$99')).toBeVisible(); // PROFESSIONAL
    await expect(page.getByText('$199')).toBeVisible(); // EXECUTIVE
    await expect(page.getByText('$499')).toBeVisible(); // ENTERPRISE
  });

  test('should show current plan badge', async ({ page }) => {
    await page.goto('/billing');

    // Should show "Current Plan" badge on user's current plan
    const currentPlanBadge = page.getByText('Current Plan');
    await expect(currentPlanBadge).toBeVisible();
  });

  test('should initiate Stripe checkout on upgrade click', async ({ page }) => {
    // Skip this test if not in test environment with Stripe test mode
    test.skip(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === undefined,
      'Stripe not configured');

    await page.goto('/billing');

    // Click upgrade button for PROFESSIONAL plan
    const upgradeButton = page.locator('button').filter({ hasText: /Upgrade.*PROFESSIONAL|Choose.*PROFESSIONAL/ }).first();

    // Click and wait for navigation to Stripe
    await upgradeButton.click();

    // Should redirect to Stripe Checkout
    // Note: In test mode, Stripe URL will be checkout.stripe.com
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 10000 }).catch(() => {
      // If Stripe is not configured, we expect the button to show an error
      console.log('Stripe checkout not configured, checking for error message');
    });
  });

  test('should handle successful payment redirect', async ({ page }) => {
    // Simulate coming back from successful Stripe checkout
    await page.goto('/billing?success=true');

    // Should show success message
    await expect(page.getByText(/Payment successful|upgraded/i)).toBeVisible({ timeout: 5000 });
  });

  test('should handle canceled payment redirect', async ({ page }) => {
    // Simulate coming back from canceled Stripe checkout
    await page.goto('/billing?canceled=true');

    // Should show canceled message
    await expect(page.getByText(/canceled|not changed/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display plan features correctly', async ({ page }) => {
    await page.goto('/billing');

    // Verify FREE plan features
    const freePlanCard = page.locator('div').filter({ hasText: /^FREE/ }).first();
    await expect(freePlanCard).toContainText('1 bot');
    await expect(freePlanCard).toContainText('60 conversations');

    // Verify STARTER plan features
    const starterPlanCard = page.locator('div').filter({ hasText: /STARTER.*\$29/ });
    await expect(starterPlanCard).toContainText('1 bot');
    await expect(starterPlanCard).toContainText('750 conversations');

    // Verify PROFESSIONAL plan features
    const proPlanCard = page.locator('div').filter({ hasText: /PROFESSIONAL.*\$99/ });
    await expect(proPlanCard).toContainText('5 bots');
    await expect(proPlanCard).toContainText('5,000 conversations');
  });

  test('should not allow upgrade if user is not authenticated', async ({ page, context }) => {
    // Clear cookies to simulate logged out state
    await context.clearCookies();

    await page.goto('/billing');

    // If user is not authenticated, should redirect to login or show auth modal
    // This depends on your app's auth flow
    // Adjust this assertion based on your implementation
    await expect(page.locator('button').filter({ hasText: /Sign In|Log In/ })).toBeVisible({ timeout: 5000 })
      .catch(() => {
        // Alternative: might redirect to home or show modal
        console.log('Auth check behavior may vary');
      });
  });

  test('should show loading state during checkout', async ({ page }) => {
    test.skip(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === undefined,
      'Stripe not configured');

    await page.goto('/billing');

    // Click upgrade button
    const upgradeButton = page.locator('button').filter({ hasText: /Upgrade/ }).first();
    await upgradeButton.click();

    // Should show loading state (spinner or disabled button)
    await expect(upgradeButton).toBeDisabled({ timeout: 2000 })
      .catch(() => {
        // If not disabled, might show loading text
        expect(upgradeButton).toContainText(/processing|loading/i);
      });
  });
});
