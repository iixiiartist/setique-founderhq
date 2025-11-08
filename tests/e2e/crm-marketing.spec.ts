import { test, expect } from '@playwright/test';

test.describe('CRM Management', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(true, 'Auth setup required');
  });

  test('should switch to CRM tab', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click CRM tab
    await page.click('button:has-text("CRM")');
    
    // Verify CRM content loads
    await expect(page.locator('text=Investors')).toBeVisible();
    await expect(page.locator('text=Customers')).toBeVisible();
    await expect(page.locator('text=Partners')).toBeVisible();
  });

  test('should create new CRM item', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button:has-text("CRM")');
    
    // Click new item button
    await page.click('button:has-text("Add"), button:has-text("New")');
    
    // Fill form
    await page.fill('input[name="name"]', 'Test Company');
    await page.selectOption('select[name="type"]', 'customer');
    await page.fill('input[name="email"]', 'test@company.com');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify item appears
    await expect(page.locator('text=Test Company')).toBeVisible();
  });

  test('should filter CRM items by type', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button:has-text("CRM")');
    
    // Filter to investors only
    await page.click('button:has-text("Investors")');
    
    // Verify only investors shown
    const customerItems = page.locator('[data-type="customer"]');
    await expect(customerItems).toHaveCount(0);
  });
});

test.describe('Marketing Tab', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(true, 'Auth setup required');
  });

  test('should load marketing planner', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click Marketing tab
    await page.click('button:has-text("Marketing")');
    
    // Verify marketing content
    await expect(page.locator('text=Marketing Items')).toBeVisible();
  });

  test('should create marketing item', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button:has-text("Marketing")');
    
    // Create new item
    await page.click('button:has-text("New"), button:has-text("Add")');
    await page.fill('input[name="title"]', 'Blog Post: Product Launch');
    await page.selectOption('select[name="status"]', 'draft');
    
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('text=Blog Post: Product Launch')).toBeVisible();
  });
});
