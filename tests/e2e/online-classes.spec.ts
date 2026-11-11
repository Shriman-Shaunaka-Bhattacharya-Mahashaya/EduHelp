import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['light', 'dark']) {
  test(`Google Meet handoff and completion in ${theme} theme`, async ({ page }) => {
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/session') return route.fulfill({ json: { user: { id: 'host-1', name: 'Alex', role: 'instructor' }, expires: '2099-01-01T00:00:00Z' } });
      if (route.request().method() === 'PUT') {
        expect(route.request().postDataJSON()).toEqual({ status: 'completed' });
        return route.fulfill({ json: { message: 'Class updated' } });
      }
      return route.fulfill({ json: { title: 'Algorithms lesson', description: 'Practice together', status: 'ongoing', meetingUrl: 'https://meet.google.com/abc-defg-hij?authuser=1', canManage: true } });
    });
    await page.goto('/class/class-1');
    await page.getByRole('combobox', { name: 'Color theme' }).selectOption(theme);
    const link = page.getByRole('link', { name: 'Open Google Meet' });
    await expect(link).toHaveAttribute('href', 'https://meet.google.com/abc-defg-hij');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(page.getByRole('heading', { name: 'Algorithms lesson' })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Mark class completed' }).click();
    await expect(page.getByText('This class is completed.')).toBeVisible();
    await expect(link).toHaveCount(0);
  });
}

test('unavailable classes show an error without a meeting link', async ({ page }) => {
  await page.route('**/api/**', route => {
    if (route.request().url().includes('/api/auth/session')) return route.fulfill({ json: { user: { id: 'student-1', role: 'student' }, expires: '2099-01-01T00:00:00Z' } });
    return route.fulfill({ status: 403, json: { message: 'Class has not started yet' } });
  });
  await page.goto('/class/class-1');
  await expect(page.locator('.class-error')).toHaveText('Class has not started yet');
  await expect(page.getByRole('link', { name: 'Open Google Meet' })).toHaveCount(0);
});
test('instructor edits a legacy class and starts it with a Meet link', async ({ page }) => {
  let meetingUrl = '';
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/session') return route.fulfill({ json: { user: { id: 'host-1', name: 'Alex', role: 'instructor' }, expires: '2099-01-01T00:00:00Z' } });
    if (path === '/api/notifications') return route.fulfill({ json: { notifications: [] } });
    if (path === '/api/messages/unread') return route.fulfill({ json: { unreadCount: 0 } });
    if (path === '/api/instructor/classes/class-1') {
      const body = route.request().postDataJSON();
      if (body.meetingUrl) meetingUrl = body.meetingUrl;
      return route.fulfill({ json: { message: 'Class updated' } });
    }
    if (path === '/api/instructor/classes') return route.fulfill({ json: { classes: [{ _id: 'class-1', title: 'Algorithms lesson', description: 'Practice together', scheduledAt: '2027-01-01T12:00:00Z', durationMinutes: 60, status: 'scheduled', meetingUrl }] } });
    if (path === '/api/classes/class-1') return route.fulfill({ json: { title: 'Algorithms lesson', description: 'Practice together', status: 'ongoing', meetingUrl, canManage: true } });
    return route.fulfill({ json: { exams: [], hasMore: false } });
  });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Classes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start Class', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Add Meet link' }).click();
  await page.getByLabel('Google Meet link').fill('https://example.com/meeting');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Enter a Google Meet link' })).toContainText('Enter a Google Meet link');
  await page.getByLabel('Google Meet link').fill('https://meet.google.com/abc-defg-hij?authuser=1');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('status')).toContainText('Class updated successfully');
  expect(meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
  await page.getByRole('button', { name: 'Start Class', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open Google Meet' })).toBeVisible();
});
