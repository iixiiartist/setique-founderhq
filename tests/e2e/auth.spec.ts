import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/FounderHQ/);
    
    // Check for key landing page elements
    await expect(
      page.getByRole('heading', { name: /One GTM Command Center/i })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Launch FounderHQ/i })).toBeVisible();
  });

  test('should navigate to login', async ({ page }) => {
    await page.goto('/');
    
    // Find and click login button
    const loginButton = page.locator('a:has-text("Sign In")').first();
    await loginButton.click();
    
    // Should navigate into the authenticated app or auth flow
    await expect(page).toHaveURL(/(login|auth|app)/);
  });

  test('should show signup option', async ({ page }) => {
    await page.goto('/');
    
    // Find signup button
    const signupButton = page.locator('a:has-text("Get Started"), a:has-text("Launch FounderHQ")').first();
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
