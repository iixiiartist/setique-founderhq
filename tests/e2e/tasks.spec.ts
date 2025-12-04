import { test, expect } from '@playwright/test';
import { loginAs } from './utils/auth';
import { navigateToTab } from './utils/navigation';

// Check if test credentials are available
const hasTestCredentials = !!(
  process.env.SUPABASE_TEST_OWNER_EMAIL && 
  process.env.SUPABASE_TEST_OWNER_PASSWORD
);

test.describe('Task Management', () => {
  test.skip(!hasTestCredentials, 'Skipping: SUPABASE_TEST_OWNER_EMAIL and SUPABASE_TEST_OWNER_PASSWORD not set');

  test('allows creating, searching, and deleting a task', async ({ page }) => {
    await loginAs(page, 'owner');
    await navigateToTab(page, 'tasks');

    const taskTitle = `Playwright Task ${Date.now()}`;

    await page.getByTestId('open-task-modal-button').click();
    await page.getByTestId('task-description-input').fill(taskTitle);
    await page.getByTestId('task-create-button').click();

    const taskCard = page
      .locator('[data-testid="task-card"]').filter({ hasText: taskTitle });
    await expect(taskCard).toHaveCount(1, { timeout: 20000 });

    const searchInput = page.getByPlaceholder('Search tasks...');
    await searchInput.fill(taskTitle);
    await expect(taskCard).toBeVisible();
    await searchInput.fill('');

    page.once('dialog', (dialog) => dialog.accept());
    await taskCard.locator('[data-testid="task-delete-button"]').click();
    await expect(taskCard).toHaveCount(0, { timeout: 10000 });
  });
});
