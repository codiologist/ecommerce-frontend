import { expect, test, type Page } from '@playwright/test';

/**
 * Full auth flow against a REAL backend (requirements §9). Runs only when E2E_API_URL points at a
 * running backend that uses a disposable database - never the shared dev/production DB.
 * Example: E2E_API_URL=http://localhost:4100/api/v1 npm run test:e2e
 */
const API = process.env.E2E_API_URL;

test.skip(!API, 'E2E_API_URL not set: no backend for the auth E2E flow');

function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/content security policy/i.test(msg.text())) violations.push(msg.text());
  });
  return violations;
}

test('register → login → account → security → logout', async ({ page }) => {
  const violations = watchCsp(page);
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'E2e-Strong-Password-91';

  // Protected page without a session → login with ?next
  await page.goto('/account/security');
  await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fsecurity/);

  // Register
  await page.goto('/register');
  await page.getByLabel('Full name').fill('E2E Shopper');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  // Login, then land on ?next
  await page.goto('/login?next=%2Faccount%2Fsecurity');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(/\/account\/security$/);
  await expect(page.getByRole('heading', { name: 'Security' })).toBeVisible();
  await expect(page.getByText('This device')).toBeVisible();

  // Auth cookies are HttpOnly: not readable from page JS.
  const visible = await page.evaluate(() => document.cookie);
  expect(visible).not.toMatch(/access_token|refresh_token/);
  expect(visible).toMatch(/csrf_token=/);

  // 2FA setup renders the QR + OTP input (exercises nonce'd <style> injection under the CSP)
  await page.getByRole('button', { name: 'Set up two-factor authentication' }).click();
  await expect(page.getByAltText(/QR code/)).toBeVisible();

  // Profile
  await page.getByRole('link', { name: 'Profile' }).click();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText('Not verified')).toBeVisible();
  await page.getByLabel('Full name').fill('E2E Renamed');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();

  // Logout from the account menu
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();

  // Session really gone: protected page bounces to login again
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login/);

  // Wrong password → generic error
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('form', { name: 'Log in' }).getByRole('alert')).toContainText(
    'Invalid email or password',
  );

  expect(violations).toEqual([]);
});

test('customers see "Access denied" in the admin area', async ({ page }) => {
  const email = `e2e-cust-${Date.now()}@example.com`;
  const password = 'E2e-Strong-Password-92';
  await page.goto('/register');
  await page.getByLabel('Full name').fill('E2E Customer');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  await page.goto('/login?next=%2Fadmin');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});
