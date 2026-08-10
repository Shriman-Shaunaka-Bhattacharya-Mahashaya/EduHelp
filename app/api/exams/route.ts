import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import Exam from '@/models/Exam';

// POST: Upload a new exam
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      courseName,
      topics,
      type,
      scheduledFor,
      durationMinutes,
      targetDepartment,
      targetBatch,
      questions,
    } = body;

    if (!courseName || !type || !questions || questions.length === 0) {
      return NextResponse.json(
        { message: 'Missing required exam data' },
        { status: 400 }
      );
    }

    if (type === 'scheduled' && !scheduledFor) {
      return NextResponse.json(
        { message: 'Scheduled exams must have a date and time' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const newExam = await Exam.create({
      courseName,
      topics: topics || [],
      type,
      scheduledFor: type === 'scheduled' ? new Date(scheduledFor) : undefined,
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : 60,
      instructor: session.user.id,
      targetDepartment,
      targetBatch: targetBatch ? parseInt(targetBatch) : undefined,
      questions,
    });

    return NextResponse.json(
      { message: 'Exam created successfully', examId: newExam._id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Exam Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}

// GET: Fetch exams
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // If instructor, fetch only their exams.
    // If student, this could be extended to fetch available exams (Phase 3).
    if (session.user.role === 'instructor') {
      const exams = await Exam.find({ instructor: session.user.id }).sort({ createdAt: -1 });
      return NextResponse.json({ exams }, { status: 200 });
    } else {
      // Logic for student fetching exams later
      return NextResponse.json({ message: 'Student exam fetching to be implemented' }, { status: 501 });
    }
  } catch (error: any) {
    console.error('Fetch Exams Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
