import { test, expect, type Page, type Locator } from '@playwright/test';

async function mockWorkspace(page: Page, role: 'student' | 'instructor') {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/session') return route.fulfill({ json: { user: { id: 'user-1', name: 'Alex Taylor', role }, expires: '2099-01-01T00:00:00Z' } });
    if (path === '/api/notifications') return route.fulfill({ json: { notifications: [] } });
    if (path === '/api/messages/unread') return route.fulfill({ json: { unreadCount: 0 } });
    if (path.endsWith('/submissions')) return route.fulfill({ json: { submissions: [] } });
    if (path === '/api/instructor/assignments') return route.fulfill({ json: { assignments: [{ _id: 'assignment-1', title: 'Algorithms worksheet', courseName: 'Algorithms', description: 'Practice problems', maxMarks: 100 }], hasMore: false } });
    if (path === '/api/student/content/courses') return route.fulfill({ json: { courses: ['Algorithms'] } });
    if (path === '/api/student/content') return route.fulfill({ json: { content: [{ _id: 'content-1', title: 'Algorithm notes', course: 'Algorithms', description: 'Study notes', createdAt: '2026-11-11T00:00:00Z' }], hasMore: false } });
    if (path === '/api/student/announcements') return route.fulfill({ json: { announcements: [], hasMore: false } });
    return route.fulfill({ json: { exams: [], hasMore: false } });
  });
}

async function expectViewportBounds(page: Page, overlay: Locator) {
  const viewport = page.viewportSize()!;
  const bounds = await overlay.boundingBox();
  expect(bounds?.x).toBeCloseTo(0, 0);
  expect(bounds?.y).toBeCloseTo(0, 0);
  expect(bounds?.width).toBeCloseTo(viewport.width, 0);
  expect(bounds?.height).toBeCloseTo(viewport.height, 0);
}

async function enableGlass(page: Page, theme: string) {
  await page.getByRole('combobox', { name: 'Color theme' }).selectOption(theme);
  // Exercise actual blur even if this machine prefers reduced transparency.
  await page.addStyleTag({ content: ':root { --glass-filter: blur(20px) saturate(115%) !important; }' });
  expect(await page.locator('.workspace-content').evaluate(element => getComputedStyle(element).backdropFilter)).toContain('blur(20px)');
}

for (const theme of ['light', 'dark']) {
  test(`exam dialog covers the viewport outside its ${theme} glass panel`, async ({ page }) => {
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/session') return route.fulfill({ json: { user: { id: 'instructor-1', name: 'Alex Taylor', role: 'instructor' }, expires: '2099-01-01T00:00:00Z' } });
      if (url.pathname === '/api/notifications') return route.fulfill({ json: { notifications: [] } });
      if (url.pathname === '/api/messages/unread') return route.fulfill({ json: { unreadCount: 0 } });
      if (url.pathname === '/api/exams') return route.fulfill({ json: { exams: url.searchParams.get('type') === 'practice' ? [{ _id: 'exam-1', courseName: 'Algorithms', type: 'practice', durationMinutes: 60, questions: [], topics: [], expireAt: '2099-01-01T00:00:00Z' }] : [], hasMore: false } });
      return route.fulfill({ json: {} });
    });
    await page.goto('/dashboard');
    await enableGlass(page, theme);
    await page.getByRole('button', { name: 'Edit Settings', exact: true }).click();
    const dialogHeading = page.getByRole('heading', { name: 'Edit Exam Settings' });
    await expect(dialogHeading).toBeVisible();
    const overlay = dialogHeading.locator('..').locator('..');
    await expectViewportBounds(page, overlay);
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialogHeading).toHaveCount(0);
  });

  test(`assignment submissions cover the viewport outside the ${theme} glass panel`, async ({ page }) => {
    await mockWorkspace(page, 'instructor');
    await page.goto('/dashboard');
    await enableGlass(page, theme);
    await page.getByRole('button', { name: 'Assignments', exact: true }).click();
    await page.getByRole('button', { name: 'View Submissions', exact: true }).click();
    const heading = page.getByRole('heading', { name: 'Submissions for Algorithms worksheet' });
    await expect(heading).toBeVisible();
    await expectViewportBounds(page, heading.locator('..').locator('..').locator('..'));
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(heading).toHaveCount(0);
  });

  test(`document assistant stays at the viewport edge outside the ${theme} glass panel`, async ({ page }) => {
    await mockWorkspace(page, 'student');
    await page.goto('/dashboard');
    await enableGlass(page, theme);
    await page.getByRole('button', { name: 'Materials', exact: true }).click();
    await page.getByRole('heading', { name: 'Algorithms', exact: true }).click();
    await page.getByRole('button', { name: /Chat with Document/ }).click();
    const input = page.getByRole('textbox', { name: 'Question for study assistant' });
    await expect(input).toBeVisible();
    const panel = input.locator('..').locator('..');
    const viewport = page.viewportSize()!;
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeCloseTo(viewport.width - 16, 0);
    expect(bounds!.y + bounds!.height).toBeCloseTo(viewport.height - 16, 0);
    await page.getByRole('button', { name: 'Close study assistant' }).click();
    await expect(input).toHaveCount(0);
  });
}
