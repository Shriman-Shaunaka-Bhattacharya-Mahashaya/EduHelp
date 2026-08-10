import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
import Exam from '@/models/Exam';
import User from '@/models/User';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const attemptId = resolvedParams.id;
    if (!attemptId) {
      return NextResponse.json({ message: 'Missing attempt ID' }, { status: 400 });
    }

    await connectToDatabase();

    const attempt = await ExamAttempt.findById(attemptId).populate('exam').lean();

    if (!attempt || attempt.student.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Attempt not found or unauthorized' }, { status: 404 });
    }

    if (!attempt.isCompleted) {
      return NextResponse.json({ message: 'Exam attempt not completed yet' }, { status: 400 });
    }

    const examId = attempt.exam._id;

    // Fetch leaderboard data
    const allAttempts = await ExamAttempt.find({ exam: examId, isCompleted: true })
      .populate('student', 'fullName')
      .lean();

    const leaderboard = allAttempts.map((a: any) => {
      const totalTime = a.answers.reduce((acc: number, curr: any) => acc + (curr.timeTaken || 0), 0);
      return {
        studentId: a.student._id,
        studentName: a.student.fullName,
        score: a.score,
        totalTime,
      };
    });

    leaderboard.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTime - b.totalTime;
    });

    const totalTimeTaken = attempt.answers.reduce((acc: number, curr: any) => acc + (curr.timeTaken || 0), 0);

    return NextResponse.json({
      attempt,
      totalTimeTaken,
      leaderboard
    }, { status: 200 });

  } catch (error: any) {
    console.error('Fetch Attempt Review Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
