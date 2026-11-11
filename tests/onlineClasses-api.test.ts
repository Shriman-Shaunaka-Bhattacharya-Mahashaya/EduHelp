import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), connect: vi.fn(), find: vi.fn(), user: vi.fn(), save: vi.fn() }));
vi.mock('next-auth/next', () => ({ getServerSession: mocks.session }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('@/lib/mongodb', () => ({ default: mocks.connect }));
vi.mock('@/models/OnlineClass', () => {
  class ClassModel { static findById = mocks.find; save = mocks.save; constructor(data: object) { Object.assign(this, data); } }
  return { default: ClassModel };
});
vi.mock('@/models/User', () => ({ default: { findById: mocks.user } }));
import { GET } from '@/app/api/classes/[id]/route';
import { POST } from '@/app/api/instructor/classes/route';
import { PUT } from '@/app/api/instructor/classes/[id]/route';
const context = { params: Promise.resolve({ id: 'class-1' }) };
const request = () => new Request('http://localhost/api/classes/class-1');
let record: Record<string, unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: 'student-1', role: 'student' } });
  mocks.user.mockResolvedValue({ department: 'CS', graduationYear: 2027 });
  record = { instructorId: 'host-1', title: 'Algorithms', description: 'Practice', status: 'ongoing', meetingUrl: 'https://meet.google.com/abc-defg-hij?authuser=1', save: mocks.save };
  mocks.find.mockResolvedValue(record);
});
describe('class link access', () => {
  it('returns a canonical private link to eligible students', async () => {
    const response = await GET(request(), context);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ title: 'Algorithms', description: 'Practice', status: 'ongoing', meetingUrl: 'https://meet.google.com/abc-defg-hij', canManage: false });
  });
  it.each(['scheduled', 'completed'])('withholds %s class links', async status => {
    record.status = status;
    expect((await GET(request(), context)).status).toBe(403);
  });
  it.each([{ targetDepartment: 'EE' }, { targetBatch: 2028 }, { targetStudents: ['other'] }])('enforces audience %j', async audience => {
    Object.assign(record, audience);
    expect((await GET(request(), context)).status).toBe(403);
  });
  it('rejects other instructors and permits the owner', async () => {
    mocks.session.mockResolvedValue({ user: { id: 'other', role: 'instructor' } });
    expect((await GET(request(), context)).status).toBe(403);
    mocks.session.mockResolvedValue({ user: { id: 'host-1', role: 'instructor' } });
    expect((await (await GET(request(), context)).json()).canManage).toBe(true);
  });
  it('reports missing legacy links and deleted classes', async () => {
    record.meetingUrl = undefined;
    expect((await GET(request(), context)).status).toBe(409);
    mocks.find.mockResolvedValue(null);
    expect((await GET(request(), context)).status).toBe(404);
  });
});
describe('class updates', () => {
  const update = (body: unknown) => PUT(new Request('http://localhost/api/instructor/classes/class-1', { method: 'PUT', body: JSON.stringify(body) }), context);
  beforeEach(() => mocks.session.mockResolvedValue({ user: { id: 'host-1', role: 'instructor' } }));
  it('requires a Meet link before starting legacy classes', async () => {
    record.meetingUrl = undefined;
    expect((await update({ status: 'ongoing' })).status).toBe(409);
    expect(mocks.save).not.toHaveBeenCalled();
    expect((await update({ meetingUrl: 'https://meet.google.com/abc-defg-hij', status: 'ongoing' })).status).toBe(200);
  });
  it('allows completion of legacy classes', async () => {
    record.meetingUrl = undefined;
    expect((await update({ status: 'completed' })).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith({ validateModifiedOnly: true });
  });
  it.each([{ meetingUrl: 'https://evil.com' }, { status: 'invalid' }])('rejects invalid updates %j', async body => {
    expect((await update(body)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('prevents updating another instructor’s class', async () => {
    record.instructorId = 'other';
    expect((await update({ status: 'completed' })).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});

describe('schedule classes', () => {
  beforeEach(() => mocks.session.mockResolvedValue({ user: { id: 'host-1', role: 'instructor' } }));
  const details = { title: 'Algorithms', description: 'Practice', scheduledAt: '2027-01-01T12:00:00Z', durationMinutes: 60, meetingUrl: 'https://meet.google.com/abc-defg-hij?authuser=1' };
  const create = (body: unknown) => POST(new Request('http://localhost/api/instructor/classes', { method: 'POST', body: JSON.stringify(body) }));
  it('saves canonical links with the authenticated owner and scheduled status', async () => {
    const response = await create({ ...details, instructorId: 'other', status: 'ongoing' });
    expect(response.status).toBe(201);
    expect((await response.json()).class).toMatchObject({ instructorId: 'host-1', status: 'scheduled', meetingUrl: 'https://meet.google.com/abc-defg-hij' });
    expect(mocks.save).toHaveBeenCalledOnce();
  });
  it.each(['', 'https://example.com/meeting'])('rejects missing or invalid Meet link %s', async meetingUrl => {
    expect((await create({ ...details, meetingUrl })).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
  });
});
