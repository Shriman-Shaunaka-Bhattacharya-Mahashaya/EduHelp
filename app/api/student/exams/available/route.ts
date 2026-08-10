import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import Exam from '@/models/Exam';
import User from '@/models/User';
import ExamAttempt from '@/models/ExamAttempt';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const student = await User.findById(session.user.id);
    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    // 1. Fetch available exams: Matches target department/batch OR has no targets
    const availableExamsQuery = {
      $and: [
        {
          $or: [
            { targetDepartment: student.department },
            { targetDepartment: { $exists: false } },
            { targetDepartment: null },
            { targetDepartment: "" }
          ]
        },
        {
          $or: [
            { targetBatch: student.graduationYear },
            { targetBatch: { $exists: false } },
            { targetBatch: null }
          ]
        }
      ]
    };

    const exams = await Exam.find(availableExamsQuery)
      .populate('instructor', 'fullName')
      .sort({ createdAt: -1 })
      .lean(); // Lean to easily modify the result

    // 2. Fetch all attempts by this student
    const attempts = await ExamAttempt.find({ student: student._id }).lean();
    const attemptedExamIds = attempts.map(a => a.exam.toString());

    // 3. Filter available exams
    const now = new Date();
    const available = [];
    const given = [];

    for (const exam of exams) {
      const isAttempted = attemptedExamIds.includes(exam._id.toString());
      const attempt = attempts.find(a => a.exam.toString() === exam._id.toString());

      if (isAttempted && attempt?.isCompleted) {
        // Exam given
        given.push({ ...exam, attempt });
      } else if (exam.type === 'scheduled') {
        // Scheduled logic - STRICT RULE
        const scheduledTime = new Date(exam.scheduledFor!);
        const loginWindowEnd = new Date(scheduledTime.getTime() + 15 * 60000); // 15 mins

        if (now > loginWindowEnd) {
          // Time exceeded the 15-minute window
          available.push({ ...exam, isExpired: true });
        } else if (now < scheduledTime) {
          // Future scheduled exams
          available.push({ ...exam, isUpcoming: true });
        } else {
          // Within the active 15-minute window
          available.push(exam);
        }
      } else {
        // Practice logic
        available.push(exam);
      }
    }

    return NextResponse.json({ available, given }, { status: 200 });

  } catch (error: any) {
    console.error('Fetch Student Exams Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
