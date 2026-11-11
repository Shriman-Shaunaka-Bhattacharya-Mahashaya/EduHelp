import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import User from '@/models/User';
import Exam from '@/models/Exam';
import OnlineClass from '@/models/OnlineClass';
import AssignmentSubmission from '@/models/AssignmentSubmission';

const common = { email: 'alex@example.com', password: 'hashed-password', fullName: 'Alex', department: 'Computer Science' };
describe('model validation without a database', () => {
  it('accepts a complete student', () => expect(new User({ ...common, role: 'student', registrationNumber: 'R1', rollNumber: '1', graduationYear: 2027 }).validateSync()).toBeUndefined());
  it('accepts an instructor without student fields', () => expect(new User({ ...common, role: 'instructor', instructorId: 'I1' }).validateSync()).toBeUndefined());
  it.each(['registrationNumber', 'rollNumber', 'graduationYear'])('requires student %s', field => {
    const user = new User({ ...common, role: 'student' });
    expect(user.validateSync()?.errors).toHaveProperty(field);
  });
  it('rejects invalid roles and emails', () => {
    const error = new User({ ...common, role: 'admin', email: 'invalid' }).validateSync();
    expect(error?.errors).toHaveProperty('role');
    expect(error?.errors).toHaveProperty('email');
  });
  it('does not select passwords by default', () => expect(User.schema.path('password').options.select).toBe(false));
  it('requires a schedule only for scheduled exams', () => {
    const fields = { courseName: 'Algorithms', instructor: new Types.ObjectId(), expireAt: new Date(), questions: [{ questionText: 'Q', options: ['A', 'B'], correctOptionIndex: 1 }] };
    expect(new Exam({ ...fields, type: 'practice' }).validateSync()).toBeUndefined();
    expect(new Exam({ ...fields, type: 'scheduled' }).validateSync()?.errors).toHaveProperty('scheduledFor');
  });
  it('defaults an exam to 60 minutes with no reminders sent', () => {
    const exam = new Exam();
    expect(exam.durationMinutes).toBe(60);
    expect(exam.remindersSent.oneDay).toBe(false);
    expect(exam.remindersSent.twoHours).toBe(false);
    expect(exam.remindersSent.fiveMins).toBe(false);
  });
  it('rejects unsupported class states', () => expect(new OnlineClass({ status: 'invalid' }).validateSync()?.errors).toHaveProperty('status'));
  it('requires attachment metadata on a submission', () => {
    const errors = new AssignmentSubmission({ assignmentId: new Types.ObjectId(), studentId: new Types.ObjectId() }).validateSync()?.errors;
    for (const key of ['attachment.filename', 'attachment.url', 'attachment.publicId']) expect(Object.keys(errors || {})).toContain(key);
  });
});
