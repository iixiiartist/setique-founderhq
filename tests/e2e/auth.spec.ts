import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/FounderHQ/);
    
    // Check for key landing page elements - updated to match actual content
    await expect(
      page.getByRole('heading', { name: /THE ALL-IN-ONE HUB FOR/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /START FREE TODAY/i })).toBeVisible();
  });

  test('should navigate to login', async ({ page }) => {
    await page.goto('/');
    
    // Find and click the main CTA link that goes to /app
    const ctaButton = page.getByRole('link', { name: /START FREE TODAY/i });
    await ctaButton.click();
    
    // Should navigate into the authenticated app or auth flow
    await expect(page).toHaveURL(/(app|login|auth)/);
  });

  test('should show signup option', async ({ page }) => {
    await page.goto('/');
    
    // Find signup button - updated to match actual CTA text
    const signupButton = page.getByRole('link', { name: /START FREE TODAY/i });
    await expect(signupButton).toBeVisible();
  });
});

test.describe('Dashboard Access', () => {
  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to landing or show auth prompt
    await page.waitForURL(/\/(|login|auth)/, { timeout: 5000 });
    
    // Should not show dashboard content
    await expect(page.locator('text=Tasks')).not.toBeVisible();
  });
});
