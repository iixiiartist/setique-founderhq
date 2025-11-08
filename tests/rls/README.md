# RLS Test Suite

Automated Row-Level Security (RLS) policy tests for Supabase database.

## Overview

These tests verify that RLS policies correctly enforce access control across all database tables. Tests cover:

- **Tasks** - Task CRUD operations
- **Marketing Items** - Marketing content management
- **Activity Log** - Audit trail access

## Test Users

Before running tests, create these test users in your Supabase project:

1. **Test Owner** - `test-owner@example.com` / `test-password-123`
2. **Test Member** - `test-member@example.com` / `test-password-123`
3. **Test Non-Member** - `test-nonmember@example.com` / `test-password-123`

### Creating Test Users

Go to Supabase Dashboard → Authentication → Users and manually add these three users with the passwords above.

## Environment Setup

Ensure these environment variables are set:

```bash
VITE_SUPABASE_URL=https://jffnzpdcmdalxqhkfymx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Running Tests

```bash
# Run all RLS tests
npm run test:rls

# Run tests in watch mode
npm test

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

### `setup.ts`
- Creates authenticated and anonymous Supabase clients
- Defines test user credentials
- Provides cleanup utilities

### `tasks.test.ts`
- Tests task INSERT, SELECT, UPDATE, DELETE policies
- Verifies owner can manage all tasks
- Verifies members can only update/delete their own tasks
- Verifies non-members are blocked

### `marketing.test.ts`
- Tests marketing item CRUD operations
- Verifies workspace member access control
- Ensures non-members cannot access items

### `activity.test.ts`
- Tests activity log INSERT and SELECT policies
- Verifies audit trail integrity (no updates/deletes)
- Ensures proper workspace isolation

## Expected Behavior

### ✅ Should Allow:
- Workspace owners to perform all operations
- Workspace members to create and view items
- Members to update/delete their own items
- Activity logs to be created by members

### ❌ Should Deny:
- Non-members from accessing workspace data
- Anonymous users from any operations
- Updates/deletes to activity logs (immutable audit trail)
- Cross-workspace access

## CI Integration

Tests can run in CI/CD pipeline with:

```yaml
- name: Run RLS Tests
  run: npm run test:rls
  env:
    VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

## Troubleshooting

### "Missing Supabase environment variables"
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your `.env` file.

### "Failed to authenticate"
Ensure test users exist in Supabase with correct passwords.

### "violates row-level security policy"
This is expected for non-members. If owner/member tests fail with this, check:
1. workspace_members table has correct entries
2. RLS policies are properly configured
3. User is actually a member of the test workspace

## Coverage Goals

Target 80%+ coverage on:
- All RLS policies
- All CRUD operations
- Owner vs member vs non-member scenarios
- Anonymous access denial
