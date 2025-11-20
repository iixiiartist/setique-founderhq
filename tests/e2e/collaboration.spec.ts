import { test, expect } from '@playwright/test';
import { loginAs } from './utils/auth';
import { navigateToTab } from './utils/navigation';

test.describe('Team Collaboration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'owner');
    await navigateToTab(page, 'settings');
    await expect(page.locator('text=Team Members')).toBeVisible();
  });

  test('should display workspace members list', async ({ page }) => {
    const membersSection = page.locator('text=Team Members');
    await expect(membersSection).toBeVisible();
    await expect(page.getByTestId('open-invite-team-modal')).toBeVisible();
  });

  test('should open and close team invite modal', async ({ page }) => {
    await page.getByTestId('open-invite-team-modal').click();
    const modal = page.getByTestId('invite-team-modal');
    await expect(modal).toBeVisible();

    const inviteEmail = `playwright-invite+${Date.now()}@example.com`;
    await page.getByTestId('invite-email-input').fill(inviteEmail);
    await page.getByTestId('invite-role-select').selectOption('member');
    await page.getByTestId('invite-cancel-button').click();
    await expect(modal).toBeHidden();
  });
});

test.describe.skip('RLS Enforcement (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    // Requires multiple test accounts
  });

  test('members should only see workspace data', async ({ page }) => {
    // Login as workspace member
    await page.goto('/dashboard');
    
    // Should see workspace tasks
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
    
    // Switch to different workspace (if user has multiple)
    // Should see different data
  });

  test('non-members should not access workspace', async ({ page }) => {
    // Login as user NOT in workspace
    await page.goto('/dashboard?workspace=other-workspace-id');
    
    // Should show access denied or redirect
    await expect(page.locator('text=Access Denied')).toBeVisible();
  });
});
