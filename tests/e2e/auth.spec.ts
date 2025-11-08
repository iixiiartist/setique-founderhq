import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/FounderHQ/);
    
    // Check for key landing page elements
    await expect(page.locator('text=Lightweight GTM Hub')).toBeVisible();
  });

  test('should navigate to login', async ({ page }) => {
    await page.goto('/');
    
    // Find and click login button
    const loginButton = page.locator('button:has-text("Log In"), a:has-text("Log In")').first();
    await loginButton.click();
    
    // Should show login form or redirect to Supabase auth
    await expect(page).toHaveURL(/login|auth/);
  });

  test('should show signup option', async ({ page }) => {
    await page.goto('/');
    
    // Find signup button
    const signupButton = page.locator('button:has-text("Sign Up"), a:has-text("Get Started")').first();
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
