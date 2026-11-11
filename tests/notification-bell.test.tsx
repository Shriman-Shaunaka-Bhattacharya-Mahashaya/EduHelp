// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBell from '@/components/NotificationBell';

afterEach(cleanup);
const notification = { _id: 'n1', title: 'Upcoming exam', message: 'Your exam starts soon', read: false, createdAt: '2026-11-11T10:00:00Z' };
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ notifications: [notification] }) });
  vi.stubGlobal('fetch', fetchMock);
});
describe('notification bell', () => {
  it('opens and closes with the keyboard', async () => {
    render(<NotificationBell />);
    const bell = screen.getByRole('button', { name: 'Notifications' });
    await userEvent.click(bell);
    expect(await screen.findByRole('region', { name: 'Notifications' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(bell).toHaveAttribute('aria-expanded', 'false');
  });
  it('does not mark notifications as read when the server rejects the update', async () => {
    render(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    const markAll = await screen.findByRole('button', { name: 'Mark all as read' });
    fetchMock.mockResolvedValueOnce({ ok: false });
    await userEvent.click(markAll);
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeVisible();
  });
  it('updates read state after a successful server response', async () => {
    render(<NotificationBell />);
    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/notifications', { method: 'PUT' });
  });
});
