import { expect, Page } from '@playwright/test';

type TestRole = 'owner' | 'member';

interface Credentials {
  email: string;
  password: string;
}

const ROLE_ENV_MAP: Record<TestRole, { emailKey: string; passwordKey: string }> = {
  owner: {
    emailKey: 'SUPABASE_TEST_OWNER_EMAIL',
    passwordKey: 'SUPABASE_TEST_OWNER_PASSWORD',
  },
  member: {
    emailKey: 'SUPABASE_TEST_MEMBER_EMAIL',
    passwordKey: 'SUPABASE_TEST_MEMBER_PASSWORD',
  },
};

function getCredentials(role: TestRole): Credentials {
  const envKeys = ROLE_ENV_MAP[role];
  const email = process.env[envKeys.emailKey] || '';
  const password = process.env[envKeys.passwordKey] || '';

  if (!email || !password) {
    throw new Error(
      `Missing Playwright test credentials. Please set ${envKeys.emailKey} and ${envKeys.passwordKey} in your environment.`
    );
  }

  return { email, password };
}

export async function loginAs(page: Page, role: TestRole = 'owner') {
  const { email, password } = getCredentials(role);

  await page.goto('/app', { waitUntil: 'networkidle' });

  const alreadyAuthed = await page.getByTestId('open-side-menu-button').count();
  if (alreadyAuthed > 0) {
    return;
  }

  const emailField = page.getByLabel('Email Address');
  await expect(emailField).toBeVisible();
  await emailField.fill(email);

  const passwordField = page.getByLabel('Password');
  await passwordField.fill(password);

  const submitButton = page.locator('form button[type="submit"]');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect(page.getByTestId('open-side-menu-button')).toBeVisible({ timeout: 20000 });
}
