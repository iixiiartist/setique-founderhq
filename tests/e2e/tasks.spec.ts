import { test, expect } from '@playwright/test';

// Helper to create authenticated session
async function loginAsTestUser(page: any) {
  // This would need real test credentials or mock auth
  // For now, we'll document the approach
  await page.goto('/');
  // TODO: Implement auth flow with test credentials
}

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // await loginAsTestUser(page);
    test.skip(true, 'Auth setup required');
  });

  test('should create a new task', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click new task button
    await page.click('button:has-text("New Task")');
    
    // Fill task form
    await page.fill('input[name="title"]', 'Test Task');
    await page.fill('textarea[name="description"]', 'This is a test task');
    
    // Save task
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Verify task appears in list
    await expect(page.locator('text=Test Task')).toBeVisible();
  });

  test('should edit existing task', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find and click first task
    const firstTask = page.locator('[data-testid="task-item"]').first();
    await firstTask.click();
    
    // Edit title
    await page.fill('input[name="title"]', 'Updated Task Title');
    await page.click('button:has-text("Save")');
    
    // Verify update
    await expect(page.locator('text=Updated Task Title')).toBeVisible();
  });

  test('should delete task', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find task to delete
    const taskToDelete = page.locator('text=Test Task').first();
    await taskToDelete.hover();
    
    // Click delete button
    await page.click('button[aria-label="Delete task"]');
    
    // Confirm deletion
    await page.click('button:has-text("Confirm"), button:has-text("Delete")');
    
    // Verify task is removed
    await expect(taskToDelete).not.toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click status filter
    await page.click('button:has-text("Status")');
    await page.click('text=Completed');
    
    // Verify only completed tasks shown
    const incompleteTasks = page.locator('[data-status="todo"]');
    await expect(incompleteTasks).toHaveCount(0);
  });
});
