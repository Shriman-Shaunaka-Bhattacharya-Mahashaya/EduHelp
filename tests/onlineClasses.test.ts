import { describe, expect, it } from 'vitest';
import { normalizeMeetUrl, canStudentJoinClass, parseClassDetails } from '@/lib/onlineClasses';

const valid = { title: ' Algorithms ', description: ' Practice ', scheduledAt: '2027-01-01T12:00:00Z', durationMinutes: 60, meetingUrl: 'https://meet.google.com/ABC-DEFG-HIJ/?authuser=1#test' };

describe('Google Meet links', () => {
  it('canonicalizes links and removes account-specific parameters', () => {
    expect(normalizeMeetUrl(valid.meetingUrl)).toBe('https://meet.google.com/abc-defg-hij');
  });
  it.each([null, '', 'javascript:alert(1)', 'http://meet.google.com/abc-defg-hij', 'https://meet.google.com.evil.com/abc-defg-hij', 'https://evil.com/abc-defg-hij', 'https://user@meet.google.com/abc-defg-hij', 'https://meet.google.com:8080/abc-defg-hij', 'https://meet.google.com/new', 'https://meet.google.com/lookup/test', 'https://meet.google.com/abc-defg-hij/extra'])('rejects unsafe or non-meeting URL %s', value => {
    expect(normalizeMeetUrl(value)).toBeNull();
  });
});

describe('class input validation', () => {
  it('normalizes new classes', () => {
    expect(parseClassDetails(valid)).toEqual({ data: { ...valid, title: 'Algorithms', description: 'Practice', scheduledAt: new Date(valid.scheduledAt), meetingUrl: 'https://meet.google.com/abc-defg-hij' } });
  });
  it.each([{ title: '' }, { description: ' ' }, { scheduledAt: 'bad' }, { durationMinutes: 0 }, { durationMinutes: 1.5 }, { meetingUrl: '' }, { targetBatch: 'bad' }, { targetStudents: ['bad'] }, { targetDepartment: 2 }])('rejects invalid details %j', overrides => {
    expect(parseClassDetails({ ...valid, ...overrides })).toHaveProperty('error');
  });
  it('supports status-only edits and clearing optional filters', () => {
    expect(parseClassDetails({ status: 'completed' }, true)).toEqual({ data: {} });
    expect(parseClassDetails({ targetDepartment: '', targetBatch: '' }, true)).toEqual({ data: { targetDepartment: undefined, targetBatch: undefined } });
    expect(parseClassDetails(null)).toHaveProperty('error');
  });
});

describe('class audience', () => {
  const student = { id: 's1', department: 'CS', graduationYear: 2027 };
  it('allows unrestricted classes', () => expect(canStudentJoinClass({}, student)).toBe(true));
  it('requires all supplied restrictions to match', () => {
    expect(canStudentJoinClass({ targetDepartment: 'CS', targetBatch: 2027, targetStudents: [{ toString: () => 's1' }] }, student)).toBe(true);
    expect(canStudentJoinClass({ targetDepartment: 'EE' }, student)).toBe(false);
    expect(canStudentJoinClass({ targetBatch: 2028 }, student)).toBe(false);
    expect(canStudentJoinClass({ targetStudents: ['s2'] }, student)).toBe(false);
  });
});
