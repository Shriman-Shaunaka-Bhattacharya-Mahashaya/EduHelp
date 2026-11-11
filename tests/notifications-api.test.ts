import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), connect: vi.fn(), count: vi.fn(), find: vi.fn(), update: vi.fn(), sort: vi.fn(), limit: vi.fn(), lean: vi.fn() }));
vi.mock('next-auth/next', () => ({ getServerSession: mocks.session }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('@/lib/mongodb', () => ({ default: mocks.connect }));
vi.mock('@/models/Notification', () => ({ default: { countDocuments: mocks.count, find: mocks.find, updateMany: mocks.update } }));
import { GET, PUT } from '@/app/api/notifications/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: 'user-1' } });
  mocks.count.mockResolvedValue(3);
  mocks.find.mockReturnValue({ sort: mocks.sort });
  mocks.sort.mockReturnValue({ limit: mocks.limit });
  mocks.limit.mockReturnValue({ lean: mocks.lean });
  mocks.lean.mockResolvedValue([{ _id: 'notification-1' }]);
});
describe('notifications', () => {
  it('counts unread notifications only for the authenticated user', async () => {
    const response = await GET(new Request('http://localhost/api/notifications?unreadOnly=true&countOnly=true'));
    expect(await response.json()).toEqual({ count: 3 });
    expect(mocks.count).toHaveBeenCalledWith({ userId: 'user-1', read: false });
  });
  it('lists the latest 50 notifications for the authenticated user', async () => {
    const response = await GET(new Request('http://localhost/api/notifications'));
    expect((await response.json()).notifications).toHaveLength(1);
    expect(mocks.find).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(mocks.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(mocks.limit).toHaveBeenCalledWith(50);
  });
  it('marks only the authenticated user’s unread notifications as read', async () => {
    expect((await PUT(new Request('http://localhost/api/notifications', { method: 'PUT' }))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ userId: 'user-1', read: false }, { $set: { read: true } });
  });
});
