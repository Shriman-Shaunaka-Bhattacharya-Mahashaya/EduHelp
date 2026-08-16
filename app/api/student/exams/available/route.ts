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

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const type = url.searchParams.get('type') || 'practice';
    const status = url.searchParams.get('status') || 'available';

    // 1. Fetch all completed attempts for this student
    const attempts = await ExamAttempt.find({ student: student._id }).lean();
    const attemptedExamIds = attempts.filter(a => a.isCompleted).map(a => a.exam);

    // 2. Build the database query
    let query: any = { type };

    if (status === 'given') {
      query._id = { $in: attemptedExamIds };
    } else {
      // available
      query.$and = [
        { _id: { $nin: attemptedExamIds } },
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
      ];
    }

    const total = await Exam.countDocuments(query);
    const exams = await Exam.find(query)
      .populate('instructor', 'fullName')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // 3. Post-process the paginated results for UI flags
    const now = new Date();
    const processedExams = exams.map(exam => {
      let result: any = { ...exam };

      if (status === 'given') {
        const attempt = attempts.find(a => a.exam.toString() === exam._id.toString());
        result.attempt = attempt;
      } else if (exam.type === 'scheduled') {
        const scheduledTime = new Date(exam.scheduledFor!);
        const loginWindowEnd = new Date(scheduledTime.getTime() + 15 * 60000); // 15 mins

        if (now > loginWindowEnd) {
          result.isExpired = true;
        } else if (now < scheduledTime) {
          result.isUpcoming = true;
        }
      }
      return result;
    });

    return NextResponse.json({ 
      exams: processedExams, 
      hasMore: (page * limit) < total 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Fetch Student Exams Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
