import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function mockSession(page: Page, role: 'student' | 'instructor' | null = null) {
  await page.route('**/api/auth/session', route => route.fulfill({ json: role ? { user: { id: 'user-1', name: 'Alex Taylor', email: 'alex@example.com', role }, expires: '2099-01-01T00:00:00Z' } : {} }));
}

test('unauthenticated home redirects to login', async ({ page }) => {
  await mockSession(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
});

for (const theme of ['light', 'dark'] as const) {
  for (const path of ['/login', '/register']) {
    test(`${path} is accessible and fits the viewport in ${theme} mode`, async ({ page }, testInfo) => {
      await mockSession(page);
      await page.goto(path);
      await page.getByRole('combobox', { name: 'Color theme' }).selectOption(theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${path.slice(1)}-${theme}.png`), fullPage: true });
    });
  }
}

test('theme persists across navigation and reloads', async ({ page }) => {
  await mockSession(page);
  await page.goto('/login');
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption('dark');
  await page.getByRole('link', { name: 'Sign up' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Color theme' })).toHaveValue('dark');
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption('light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('system theme tracks OS changes without overriding explicit choices', async ({ page }) => {
  await mockSession(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption('dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('keyboard users can skip to content and see focus', async ({ page, browserName }) => {
  await mockSession(page);
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  // WebKit's default skips links; Option+Tab enables full keyboard traversal.
  // https://github.com/microsoft/playwright/issues/5609
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
});

test('registration switches roles and handles rejected requests', async ({ page }) => {
  await mockSession(page);
  await page.route('**/api/auth/register', route => route.fulfill({ status: 400, json: { message: 'User already exists with this email' } }));
  await page.goto('/register');
  await page.getByRole('button', { name: 'Instructor', exact: true }).click();
  await expect(page.getByLabel('Registration Number', { exact: true })).toHaveCount(0);
  await page.getByLabel('Full Name', { exact: true }).fill('Alex Taylor');
  await page.getByLabel('Email', { exact: true }).fill('alex@example.com');
  await page.getByLabel('Password', { exact: true }).fill('example-password');
  await page.getByLabel('Department', { exact: true }).selectOption('Computer Science');
  await page.getByLabel('Instructor ID', { exact: true }).fill('I-1');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('User already exists');
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeEnabled();
});

test('successful registration navigates to the confirmation', async ({ page }) => {
  await mockSession(page);
  await page.route('**/api/auth/register', route => route.fulfill({ status: 201, json: { message: 'User registered successfully' } }));
  await page.goto('/register');
  await page.getByRole('button', { name: 'Instructor', exact: true }).click();
  for (const [label, value] of [['Full Name', 'Alex Taylor'], ['Email', 'alex@example.com'], ['Password', 'example-password'], ['Instructor ID', 'I-1']]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('Department', { exact: true }).selectOption('Computer Science');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/login\?registered=true$/);
  await expect(page.getByRole('status')).toContainText('Registration successful');
});

test('reduced motion disables decorative movement', async ({ page }) => {
  await mockSession(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  expect(await page.getByRole('button', { name: 'Sign In' }).evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
});

test('student exam cards handle long content and failed start requests', async ({ page }) => {
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/session') return route.fulfill({ json: { user: { id: 'student-1', name: 'Alex Taylor', role: 'student' }, expires: '2099-01-01T00:00:00Z' } });
    if (url.pathname === '/api/notifications') return route.fulfill({ json: { notifications: [] } });
    if (url.pathname === '/api/messages/unread') return route.fulfill({ json: { unreadCount: 2 } });
    if (url.pathname.includes('announcements')) return route.fulfill({ json: { announcements: [], hasMore: false } });
    if (url.pathname.endsWith('/attempt')) return route.fulfill({ status: 400, json: { message: 'Unable to start this exam. Please try again.' } });
    const exams = url.searchParams.get('status') === 'available' && url.searchParams.get('type') === 'practice' ? [{ _id: 'exam-1', courseName: 'Advanced Algorithms and Data Structures for Distributed Systems', type: 'practice', durationMinutes: 60, instructor: { fullName: 'Dr. Taylor' }, questions: [{ questionText: 'Question' }] }] : [];
    return route.fulfill({ json: { exams, hasMore: false } });
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /Advanced Algorithms/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Take Exam' }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Unable to start');
  await expect(page.getByRole('button', { name: 'Take Exam' })).toBeEnabled();
});

for (const role of ['student', 'instructor'] as const) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${role} dashboard supports ${theme} theme, navigation and empty states`, async ({ page }, testInfo) => {
      await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/auth/session') return route.fulfill({ json: { user: { id: 'user-1', name: 'Alex Taylor', role }, expires: '2099-01-01T00:00:00Z' } });
        if (url.pathname === '/api/notifications') return route.fulfill({ json: { notifications: [] } });
        if (url.pathname === '/api/messages/unread') return route.fulfill({ json: { unreadCount: 0 } });
        if (url.pathname === '/api/user/profile') return route.fulfill({ json: { user: { fullName: 'Alex Taylor', email: 'alex@example.com', role, department: 'Computer Science' } } });
        if (url.pathname.includes('announcements')) return route.fulfill({ json: { announcements: [], hasMore: false } });
        if (url.pathname.includes('exams')) return route.fulfill({ json: { exams: [], hasMore: false } });
        return route.fulfill({ json: {} });
      });
      await page.goto('/dashboard');
      await expect(page.getByRole('heading', { name: 'Welcome back, Alex.' })).toBeVisible();
      await page.getByRole('combobox', { name: 'Color theme' }).selectOption(theme);
      await expect(page.getByRole('navigation', { name: 'Workspace sections' })).toBeVisible();
      await expect(page.locator('.spinner')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations).toEqual([]);
      await page.screenshot({ path: testInfo.outputPath(`${role}-${theme}.png`), fullPage: true });
      await page.getByRole('button', { name: 'Notifications', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Notifications' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('region', { name: 'Notifications' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Profile', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Profile', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(page.getByText('alex@example.com')).toBeVisible();
      if (role === 'student') {
        await page.getByRole('button', { name: 'Open study assistant' }).click();
        await expect(page.getByRole('textbox', { name: 'Question for study assistant' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const chatResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
        expect(chatResults.violations).toEqual([]);
        await page.getByRole('button', { name: 'Close study assistant' }).click();
      }
    });
  }
}
