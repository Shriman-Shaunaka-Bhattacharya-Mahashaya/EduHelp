import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }));
});

test('removes repeated delayed saved values before either field is used', async ({ page }) => {
  await page.goto('/login');
  const email = page.getByLabel('Email', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await expect(email).toHaveAttribute('readonly', '');
  await expect(password).toHaveAttribute('readonly', '');
  for (let attempt = 0; attempt < 3; attempt++) {
    // Simulate a password manager restoring DOM values after page load.
    await page.evaluate(() => {
      (document.getElementById('email') as HTMLInputElement).value = 'previous@example.com';
      (document.getElementById('password') as HTMLInputElement).value = 'previous-password';
    });
    await expect(email).toHaveValue('');
    await expect(password).toHaveValue('');
  }
});

test('clears saved values on focus and preserves freshly entered credentials', async ({ page }) => {
  await page.goto('/login');
  const email = page.getByLabel('Email', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await expect(email).toHaveAttribute('readonly', '');
  await page.evaluate(() => {
    const input = document.getElementById('email') as HTMLInputElement;
    input.value = 'previous@example.com';
    input.focus();
  });
  await expect(email).toHaveValue('');
  await email.fill('next@example.com');
  await password.focus();
  await password.fill('fresh-password');
  await email.focus();
  // Wait across multiple background checks to catch accidental typing erasure.
  await page.waitForTimeout(750);
  await expect(email).toHaveValue('next@example.com');
  await expect(password).toHaveValue('fresh-password');
});

test('clears and relocks after a rejected login, then removes later autofill', async ({ page }) => {
  await page.route('**/api/auth/csrf', route => route.fulfill({ json: { csrfToken: 'test-csrf-token' } }));
  await page.route('**/api/auth/providers', route => route.fulfill({ json: { credentials: { id: 'credentials', name: 'Credentials', type: 'credentials', signinUrl: '/api/auth/signin/credentials', callbackUrl: '/api/auth/callback/credentials' } } }));
  await page.route('**/api/auth/callback/credentials', route => route.fulfill({ status: 401, json: { url: 'http://127.0.0.1:3100/login?error=CredentialsSignin' } }));
  await page.goto('/login');
  const email = page.getByLabel('Email', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await email.focus();
  await email.fill('next@example.com');
  await password.focus();
  await password.fill('fresh-password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await expect(email).toHaveValue('');
  await expect(password).toHaveValue('');
  await expect(email).toHaveAttribute('readonly', '');
  await expect(password).toHaveAttribute('readonly', '');
  await page.evaluate(() => {
    (document.getElementById('email') as HTMLInputElement).value = 'previous@example.com';
    (document.getElementById('password') as HTMLInputElement).value = 'previous-password';
  });
  await expect(email).toHaveValue('');
  await expect(password).toHaveValue('');
});

test('returns to an empty login form through browser history', async ({ page }) => {
  await page.goto('/login');
  const email = page.getByLabel('Email', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await email.focus();
  await email.fill('previous@example.com');
  await password.focus();
  await password.fill('previous-password');
  await page.getByRole('link', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(email).toHaveValue('');
  await expect(password).toHaveValue('');
  await expect(password).toHaveAttribute('readonly', '');
});
