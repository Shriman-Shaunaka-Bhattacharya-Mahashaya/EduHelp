import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Exam from '../../../../models/Exam';
import Assignment from '../../../../models/Assignment';
import User from '../../../../models/User';
import ExamAttempt from '../../../../models/ExamAttempt';
import AssignmentSubmission from '../../../../models/AssignmentSubmission';
import Notification from '../../../../models/Notification';

// This is to prevent Vercel from caching the cron route
export const dynamic = 'force-dynamic';

const THRESHOLDS = [
  { key: 'oneDay', label: '1 Day', ms: 24 * 60 * 60 * 1000 },
  { key: 'twoHours', label: '2 Hours', ms: 2 * 60 * 60 * 1000 },
  { key: 'fiveMins', label: '5 Minutes', ms: 5 * 60 * 1000 },
] as const;

export async function GET(req: Request) {
  try {
    await connectDB();
    const now = Date.now();

    // 1. Process Assignments
    const assignments = await Assignment.find({
      deadline: { $gt: new Date(now) }
    });

    for (const assignment of assignments) {
      const timeRemaining = new Date(assignment.deadline!).getTime() - now;
      
      for (const threshold of THRESHOLDS) {
        if (timeRemaining <= threshold.ms && !assignment.remindersSent?.[threshold.key]) {
          await sendReminders(
            assignment,
            'Assignment',
            `Reminder: ${assignment.title} is due in ${threshold.label}!`,
            `You have an unsubmitted assignment for ${assignment.courseName} due soon. Please submit it on time.`,
            threshold.key
          );
        }
      }
    }

    // 2. Process Scheduled Exams
    const exams = await Exam.find({
      type: 'scheduled',
      scheduledFor: { $gt: new Date(now) }
    });

    for (const exam of exams) {
      const timeRemaining = new Date(exam.scheduledFor!).getTime() - now;
      
      for (const threshold of THRESHOLDS) {
        if (timeRemaining <= threshold.ms && !exam.remindersSent?.[threshold.key]) {
          await sendReminders(
            exam,
            'Exam',
            `Reminder: Exam for ${exam.courseName} starts in ${threshold.label}!`,
            `You have an upcoming scheduled exam for ${exam.courseName}. Don't miss it!`,
            threshold.key
          );
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Reminders processed successfully.' }, { status: 200 });
  } catch (error: any) {
    console.error('Cron Reminder Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

async function sendReminders(
  entity: any, 
  entityType: 'Exam' | 'Assignment', 
  title: string, 
  message: string, 
  thresholdKey: 'oneDay' | 'twoHours' | 'fiveMins'
) {
  // Find Target Students
  const query: any = { role: 'student' };
  if (entity.targetDepartment) query.department = entity.targetDepartment;
  if (entity.targetBatch) query.graduationYear = entity.targetBatch;
  
  const students = await User.find(query).select('_id').lean();
  if (students.length === 0) return;

  // Find who has already submitted/attempted
  let completedStudentIds = new Set<string>();

  if (entityType === 'Assignment') {
    const submissions = await AssignmentSubmission.find({ assignment: entity._id }).select('studentId').lean();
    submissions.forEach((s: any) => completedStudentIds.add(s.studentId.toString()));
  } else {
    const attempts = await ExamAttempt.find({ examId: entity._id }).select('studentId').lean();
    attempts.forEach((a: any) => completedStudentIds.add(a.studentId.toString()));
  }

  // Filter unsubmitted students
  const targetIds = students
    .map(s => s._id.toString())
    .filter(id => !completedStudentIds.has(id));

  if (targetIds.length > 0) {
    // Bulk create notifications
    const notifications = targetIds.map(userId => ({
      userId,
      title,
      message,
      type: 'reminder'
    }));

    await Notification.insertMany(notifications);
  }

  // Mark this threshold as sent so we don't spam them again
  if (!entity.remindersSent) {
    entity.remindersSent = { oneDay: false, twoHours: false, fiveMins: false };
  }
  entity.remindersSent[thresholdKey] = true;
  await entity.save();
}
