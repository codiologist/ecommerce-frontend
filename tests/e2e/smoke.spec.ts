import { expect, test } from '@playwright/test';

test('home page renders with a nonce-based CSP and security headers', async ({ page }) => {
  const cspViolations: string[] = [];
  page.on('console', (message) => {
    if (/content security policy/i.test(message.text())) cspViolations.push(message.text());
  });

  const response = await page.goto('/');
  expect(response?.status()).toBe(200);

  const headers = response?.headers() ?? {};
  expect(headers['content-security-policy']).toMatch(
    /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
  );
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-powered-by']).toBeUndefined();

  await expect(page.getByRole('heading', { level: 1, name: 'Store' })).toBeVisible();
  await expect(page.getByTestId('api-status')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(cspViolations).toEqual([]);
});

test('unknown routes render the not-found page', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
