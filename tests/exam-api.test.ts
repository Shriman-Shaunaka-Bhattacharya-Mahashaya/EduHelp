import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), connect: vi.fn(), exam: vi.fn(), attempt: vi.fn(), create: vi.fn() }));
vi.mock('next-auth/next', () => ({ getServerSession: mocks.session }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('@/lib/mongodb', () => ({ default: mocks.connect }));
vi.mock('@/models/Exam', () => ({ default: { findById: mocks.exam } }));
vi.mock('@/models/ExamAttempt', () => ({ default: { findOne: mocks.attempt, create: mocks.create } }));
import { POST } from '@/app/api/student/exams/attempt/route';

const exam = { courseName: 'Algorithms', type: 'practice', durationMinutes: 60, questions: [{ _id: 'q1', questionText: 'Question one', options: ['A', 'B'], correctOptionIndex: 1 }, { _id: 'q2', questionText: 'Question two', options: ['A', 'B'], correctOptionIndex: 0 }] };
const request = (body: unknown) => new Request('http://localhost/api/student/exams/attempt', { method: 'POST', body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ user: { id: 'student-1', role: 'student' } });
  mocks.exam.mockResolvedValue(exam);
  mocks.attempt.mockResolvedValue(null);
  mocks.create.mockResolvedValue({ _id: 'attempt-1' });
});
describe('exam attempts', () => {
  it.each([null, { user: { role: 'instructor' } }])('blocks unauthorized access', async session => {
    mocks.session.mockResolvedValue(session);
    expect((await POST(request({ examId: 'exam-1', action: 'start' }))).status).toBe(401);
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it.each([{}, { examId: 'exam-1' }, { action: 'start' }])('requires exam and action', async body => expect((await POST(request(body))).status).toBe(400));
  it('returns 404 for missing exam', async () => {
    mocks.exam.mockResolvedValue(null);
    expect((await POST(request({ examId: 'missing', action: 'start' }))).status).toBe(404);
  });
  it('never exposes correct answers when starting', async () => {
    const response = await POST(request({ examId: 'exam-1', action: 'start' }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.attemptId).toBe('attempt-1');
    for (const question of data.examDetails.questions) expect(question).not.toHaveProperty('correctOptionIndex');
    expect(mocks.create).toHaveBeenCalledWith({ exam: 'exam-1', student: 'student-1', answers: [] });
  });
  it('resumes an active practice attempt', async () => {
    mocks.attempt.mockResolvedValue({ _id: 'existing' });
    expect((await (await POST(request({ examId: 'exam-1', action: 'start' }))).json()).attemptId).toBe('existing');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each([-1, 16])('rejects starting %s minutes after scheduled time', async minutes => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-11T10:00:00Z'));
    mocks.exam.mockResolvedValue({ ...exam, type: 'scheduled', scheduledFor: new Date(Date.now() - minutes * 60000) });
    expect((await POST(request({ examId: 'exam-1', action: 'start' }))).status).toBe(400);
  });
  it.each([0, 15])('allows the scheduled window boundary at %s minutes', async minutes => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-11T10:00:00Z'));
    mocks.exam.mockResolvedValue({ ...exam, type: 'scheduled', scheduledFor: new Date(Date.now() - minutes * 60000) });
    expect((await POST(request({ examId: 'exam-1', action: 'start' }))).status).toBe(200);
  });
  it('rejects an already completed scheduled exam', async () => {
    mocks.exam.mockResolvedValue({ ...exam, type: 'scheduled', scheduledFor: new Date() });
    mocks.attempt.mockResolvedValue({ isCompleted: true });
    expect((await POST(request({ examId: 'exam-1', action: 'start' }))).status).toBe(400);
  });
  it('rejects a missing schedule', async () => {
    mocks.exam.mockResolvedValue({ ...exam, type: 'scheduled' });
    expect((await POST(request({ examId: 'exam-1', action: 'start' }))).status).toBe(400);
  });
  it.each([null, {}, 'answer'])('rejects malformed answers', async answers => expect((await POST(request({ examId: 'exam-1', action: 'submit', answers }))).status).toBe(400));
  it('rejects submitting without an active attempt', async () => expect((await POST(request({ examId: 'exam-1', action: 'submit', answers: [] }))).status).toBe(400));
  it('scores answers server-side and records unanswered questions', async () => {
    const attempt = { save: vi.fn(), answers: [], score: 0, isCompleted: false };
    mocks.attempt.mockResolvedValue(attempt);
    const response = await POST(request({ examId: 'exam-1', action: 'submit', score: 100, answers: [{ questionIndex: 0, selectedOptionIndex: 1, timeTaken: 12 }] }));
    expect((await response.json()).score).toBe(1);
    expect(attempt.isCompleted).toBe(true);
    expect(attempt.answers).toEqual([{ questionIndex: 0, selectedOptionIndex: 1, timeTaken: 12 }, { questionIndex: 1, selectedOptionIndex: -1, timeTaken: 0 }]);
    expect(attempt.save).toHaveBeenCalledOnce();
  });
  it('rejects unknown actions', async () => expect((await POST(request({ examId: 'exam-1', action: 'delete' }))).status).toBe(400));
});
