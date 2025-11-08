# End-to-End Testing with Playwright

## Overview
This directory contains E2E tests for the FounderHQ application using Playwright.

## Setup

### Install Dependencies
```bash
npm install
npx playwright install chromium
```

### Environment Setup
Create `.env.test` with test credentials:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123
```

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### Specific Test File
```bash
npx playwright test tests/e2e/auth.spec.ts
```

### UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Debug Mode
```bash
npx playwright test --debug
```

### Headed Mode (See Browser)
```bash
npx playwright test --headed
```

## Test Structure

### Authentication Tests (`auth.spec.ts`)
- Landing page load
- Login flow
- Signup flow
- Protected route access

### Task Management (`tasks.spec.ts`)
- Create task
- Edit task
- Delete task
- Filter tasks
- Task status updates

### CRM & Marketing (`crm-marketing.spec.ts`)
- CRM tab navigation
- Create CRM items (investors, customers, partners)
- Filter CRM by type
- Marketing item creation
- Marketing status workflow

### Collaboration (`collaboration.spec.ts`)
- Team invite flow
- Workspace member management
- RLS enforcement verification

## Authentication in Tests

### Current Status
Tests are currently skipped (`test.skip(true)`) because they require authenticated sessions.

### Implementation Options

#### Option 1: Use Test Credentials
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL);
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
});
```

#### Option 2: Use Supabase Test Client
```typescript
import { createClient } from '@supabase/supabase-js';

test.beforeEach(async ({ page }) => {
  const supabase = createClient(url, key);
  const { data } = await supabase.auth.signIn({
    email: 'test@example.com',
    password: 'password'
  });
  
  // Set auth token in browser
  await page.context().addCookies([{
    name: 'sb-access-token',
    value: data.session.access_token,
    domain: 'localhost',
    path: '/'
  }]);
});
```

#### Option 3: Playwright Auth State
```typescript
// global-setup.ts
import { chromium } from '@playwright/test';

export default async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Login
  await page.goto('http://localhost:3001');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Save auth state
  await context.storageState({ path: 'playwright/.auth/user.json' });
  await browser.close();
}
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### Test Data Management
- Create test-specific workspace for each run
- Clean up test data after tests complete
- Use unique identifiers (timestamps) for test items

### Selectors
- Prefer `data-testid` attributes for stability
- Use `text=` for user-visible content
- Avoid CSS selectors that may change

### Assertions
- Wait for elements before assertions
- Use `toBeVisible()` for UI elements
- Check both positive and negative cases

### Performance
- Run tests in parallel when possible
- Use `test.describe.serial()` for dependent tests
- Skip slow tests in CI with `test.slow()`

## Troubleshooting

### Tests Timing Out
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify network requests complete

### Authentication Failures
- Check test credentials are correct
- Verify Supabase URL and keys
- Check auth session persistence

### Flaky Tests
- Add explicit waits: `await page.waitForSelector()`
- Use `waitForLoadState('networkidle')`
- Check for race conditions in component rendering

## TODO
- [ ] Implement authentication helper
- [ ] Add test data fixtures
- [ ] Setup CI pipeline integration
- [ ] Add visual regression tests
- [ ] Add API mocking for offline tests
- [ ] Add performance testing
