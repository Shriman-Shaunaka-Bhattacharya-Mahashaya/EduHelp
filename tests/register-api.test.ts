import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ connect: vi.fn(), findOne: vi.fn(), create: vi.fn(), hash: vi.fn(), genSalt: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ default: mocks.connect }));
vi.mock('@/models/User', () => ({ default: { findOne: mocks.findOne, create: mocks.create } }));
vi.mock('bcryptjs', () => ({ default: { hash: mocks.hash, genSalt: mocks.genSalt } }));
import { POST } from '@/app/api/auth/register/route';

const student = { email: 'student@example.com', password: 'example-password', role: 'student', fullName: 'Test Student', department: 'Computer Science', registrationNumber: 'R1', rollNumber: '1', graduationYear: 2027 };
const request = (body: unknown) => new Request('http://localhost/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.findOne.mockResolvedValue(null);
  mocks.create.mockResolvedValue({ _id: 'new-user' });
  mocks.genSalt.mockResolvedValue('salt');
  mocks.hash.mockResolvedValue('hashed-password');
  mocks.connect.mockResolvedValue(undefined);
});
describe('registration API', () => {
  it.each(['email', 'password', 'role', 'fullName', 'department', 'registrationNumber', 'rollNumber', 'graduationYear'])('rejects missing %s', async field => {
    const body = { ...student, [field]: '' };
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('rejects an invalid role', async () => expect((await POST(request({ ...student, role: 'admin' }))).status).toBe(400));
  it('requires an instructor ID', async () => expect((await POST(request({ ...student, role: 'instructor' }))).status).toBe(400));
  it('rejects duplicate emails', async () => {
    mocks.findOne.mockResolvedValue({ _id: 'existing' });
    expect((await POST(request(student))).status).toBe(400);
    expect(mocks.hash).not.toHaveBeenCalled();
  });
  it.each(['student', 'instructor'])('creates a %s with a hashed password and excludes unrelated role fields', async role => {
    const response = await POST(request({ ...student, role, instructorId: 'I1' }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ message: 'User registered successfully', userId: 'new-user' });
    const saved = mocks.create.mock.calls[0][0];
    expect(saved.password).toBe('hashed-password');
    expect(saved).not.toHaveProperty(role === 'student' ? 'instructorId' : 'registrationNumber');
  });
  it('returns a failure when the database is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.connect.mockRejectedValue(new Error('unavailable'));
    expect((await POST(request(student))).status).toBe(500);
  });
});
