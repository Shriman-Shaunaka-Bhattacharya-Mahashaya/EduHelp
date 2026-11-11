export type ClassStatus = 'scheduled' | 'ongoing' | 'completed';

export function normalizeMeetUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname !== 'meet.google.com' || url.port || url.username || url.password) return null;
    if (!/^\/[a-z]{3}-[a-z]{4}-[a-z]{3}\/?$/i.test(url.pathname)) return null;
    return `https://meet.google.com${url.pathname.replace(/\/$/, '').toLowerCase()}`;
  } catch {
    return null;
  }
}

export function canStudentJoinClass(audience: {
  targetDepartment?: string;
  targetBatch?: number;
  targetStudents?: { toString(): string }[];
}, student: { id: string; department?: string; graduationYear?: number }): boolean {
  if (audience.targetDepartment && audience.targetDepartment !== student.department) return false;
  if (audience.targetBatch != null && audience.targetBatch !== student.graduationYear) return false;
  if (audience.targetStudents?.length && !audience.targetStudents.some(id => id.toString() === student.id)) return false;
  return true;
}

export interface ClassDetails {
  title: string;
  description: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetingUrl: string;
  targetDepartment?: string;
  targetBatch?: number;
  targetStudents?: string[];
}

export function parseClassDetails(input: unknown, partial = false): { data: Partial<ClassDetails> } | { error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'Invalid class details' };
  const body = input as Record<string, unknown>;
  const data: Partial<ClassDetails> = {};
  for (const field of ['title', 'description'] as const) {
    if (!partial || field in body) {
      const value = body[field];
      if (typeof value !== 'string' || !value.trim()) return { error: `Class ${field} is required` };
      data[field] = value.trim();
    }
  }
  if (!partial || 'scheduledAt' in body) {
    if (typeof body.scheduledAt !== 'string' || !body.scheduledAt.trim()) return { error: 'A valid scheduled time is required' };
    const date = new Date(body.scheduledAt);
    if (!Number.isFinite(date.getTime())) return { error: 'A valid scheduled time is required' };
    data.scheduledAt = date;
  }
  if (!partial || 'durationMinutes' in body) {
    if (typeof body.durationMinutes !== 'number' || !Number.isInteger(body.durationMinutes) || body.durationMinutes < 1) return { error: 'Duration must be a positive number of minutes' };
    data.durationMinutes = body.durationMinutes;
  }
  if (!partial || 'meetingUrl' in body) {
    const url = normalizeMeetUrl(body.meetingUrl);
    if (!url) return { error: 'Enter a Google Meet link such as https://meet.google.com/abc-defg-hij' };
    data.meetingUrl = url;
  }
  if ('targetDepartment' in body) {
    if (typeof body.targetDepartment !== 'string' && body.targetDepartment != null) return { error: 'Invalid department' };
    data.targetDepartment = typeof body.targetDepartment === 'string' ? body.targetDepartment.trim() || undefined : undefined;
  }
  if ('targetBatch' in body) {
    if (body.targetBatch === '' || body.targetBatch == null) data.targetBatch = undefined;
    else {
      if (typeof body.targetBatch !== 'string' && typeof body.targetBatch !== 'number') return { error: 'Invalid graduation year' };
      const batch = Number(body.targetBatch);
      if (!Number.isInteger(batch) || batch < 1) return { error: 'Invalid graduation year' };
      data.targetBatch = batch;
    }
  }
  if ('targetStudents' in body) {
    if (!Array.isArray(body.targetStudents) || !body.targetStudents.every(id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id))) return { error: 'Invalid target students' };
    data.targetStudents = body.targetStudents;
  }
  return { data };
}
