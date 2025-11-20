# End-to-End Testing with Playwright

Realistic FounderHQ flows live under `tests/e2e` and log in with actual Supabase users. The suite now depends on shared helpers (`tests/e2e/utils`) and deterministic seed data so that we can safely run it locally and in CI.

## Prerequisites

1. **Dependencies**
   ```bash
   npm install
   npx playwright install --with-deps chromium
   ```
2. **Seed Supabase fixtures** – run the SQL inside `tests/fixtures/create_test_users.sql` and `tests/fixtures/create_test_workspace.sql`. The scripts are idempotent and will create:
   - Owner / member / non-member accounts with confirmed passwords
   - A "Playwright Test Workspace" shared with the owner + member users
3. **Environment variables** – copy `.env.example` to `.env.local` (or `.env.test`) and fill in:
   ```bash
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key

   SUPABASE_TEST_OWNER_EMAIL=test-owner@example.com
   SUPABASE_TEST_OWNER_PASSWORD=test-password-123
   SUPABASE_TEST_OWNER_WORKSPACE_ID=<workspace_id_from_fixture>

   SUPABASE_TEST_MEMBER_EMAIL=test-member@example.com
   SUPABASE_TEST_MEMBER_PASSWORD=test-password-123
   SUPABASE_TEST_MEMBER_WORKSPACE_ID=<workspace_id_from_fixture>

   SUPABASE_TEST_NON_MEMBER_EMAIL=test-nonmember@example.com
   SUPABASE_TEST_NON_MEMBER_PASSWORD=test-password-123
   ```
   > These credentials are required by both the Playwright helpers and the Vitest RLS suite. Update them anytime you re-seed Supabase.

4. **App server** – the config expects the dashboard at `http://localhost:3001`. Run `npm run dev` before starting the tests (the Playwright config will automatically reuse the dev server).

## Running the suite

| Command | When to use |
| --- | --- |
| `npm run test:e2e` | Run the entire Playwright suite headlessly |
| `npx playwright test tests/e2e/tasks.spec.ts` | Target a single spec |
| `npm run test:e2e:ui` | Visual test runner for local debugging |
| `npm run test:e2e:debug` | Pause-on-error debugging shell |
| `npx playwright test --headed` | Temporarily launch the real browser |
| `npm run test:e2e:report` | Open the most recent HTML/blob report |

The default reporter configuration mirrors CI: locally you get the `list` reporter plus an interactive HTML dashboard (opened with `npm run test:e2e:report`). In CI we switch to `line + github + blob`, so GitHub Actions shows inline output and uploads a zipped trace that you can replay with `npx playwright show-report blob-report`.

## Helpers & authentication

- `tests/e2e/utils/auth.ts` exposes `loginAs(page, role)` which signs into the UI as the seeded owner (default) or member. It will throw immediately if the required env vars are missing.
- `tests/e2e/utils/navigation.ts` provides `openNavigationMenu` and `navigateToTab` utility functions that rely on deterministic `data-testid` attributes throughout the dashboard.

Specs should reuse these helpers instead of duplicating login/form code. Global state (tasks, collaboration, etc.) is cleaned up inside each spec to keep the shared workspace consistent between runs.

## Current spec coverage

| File | Coverage |
| --- | --- |
| `auth.spec.ts` | Basic smoke tests around the authentication form (still marked TODO for full coverage) |
| `tasks.spec.ts` | Creates, filters, and deletes tasks inside the seeded workspace via the UI helpers |
| `collaboration.spec.ts` | Navigates to the Team tab, verifies members, and exercises the invite modal |
| `crm-marketing.spec.ts` | Legacy skeleton specs that remain skipped until the CRM board is fully wired for deterministic data |

## CI integration

Add the following step to any pipeline after `npm ci`:

```yaml
- name: Run Playwright
  run: npm run test:e2e
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_TEST_OWNER_EMAIL: ${{ secrets.SUPABASE_TEST_OWNER_EMAIL }}
    SUPABASE_TEST_OWNER_PASSWORD: ${{ secrets.SUPABASE_TEST_OWNER_PASSWORD }}
    SUPABASE_TEST_MEMBER_EMAIL: ${{ secrets.SUPABASE_TEST_MEMBER_EMAIL }}
    SUPABASE_TEST_MEMBER_PASSWORD: ${{ secrets.SUPABASE_TEST_MEMBER_PASSWORD }}
    SUPABASE_TEST_NON_MEMBER_EMAIL: ${{ secrets.SUPABASE_TEST_NON_MEMBER_EMAIL }}
    SUPABASE_TEST_NON_MEMBER_PASSWORD: ${{ secrets.SUPABASE_TEST_NON_MEMBER_PASSWORD }}
```

Upload `playwright-report` or the generated `blob-report` folder as an artifact so failures can be replayed locally.

## Troubleshooting

- **"Missing Playwright test credentials"** – double-check the `SUPABASE_TEST_*` variables are exported in your shell/session.
- **Login form never loads** – ensure `npm run dev` successfully started on `localhost:3001` and that `VITE_SUPABASE_*` values point to the same project you seeded.
- **Stale data between runs** – rerun the SQL fixtures and, if necessary, clean up tasks/marketing items inside Supabase to restore the baseline workspace.
- **Need to inspect a failure locally** – run `npm run test:e2e:report` to open the latest HTML report, or `npx playwright show-report blob-report` if you downloaded the CI artifact.

For additional database-level access control tests see `tests/rls`.
