import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import Exam from '@/models/Exam';
import ExamAttempt from '@/models/ExamAttempt';
import User from '@/models/User';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const examId = resolvedParams.id;
    if (!examId) {
      return NextResponse.json({ message: 'Missing exam ID' }, { status: 400 });
    }

    await connectToDatabase();

    const exam = await Exam.findById(examId).lean();

    if (!exam || exam.instructor.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Exam not found or unauthorized' }, { status: 404 });
    }

    // Fetch all completed attempts
    const attempts = await ExamAttempt.find({ exam: examId, isCompleted: true })
      .populate('student', 'fullName')
      .lean();

    const totalAttempts = attempts.length;
    let averageScore = 0;

    const leaderboard = [];
    const questionStats = exam.questions.map((q: any, i: number) => ({
      questionIndex: i,
      questionText: q.questionText,
      correctCount: 0,
      incorrectCount: 0,
      unattemptedCount: 0,
      optionsSelected: new Array(q.options.length).fill(0),
    }));

    if (totalAttempts > 0) {
      let totalScoreSum = 0;

      for (const a of attempts) {
        totalScoreSum += a.score;
        let totalTime = 0;

        for (let i = 0; i < exam.questions.length; i++) {
          const ans = a.answers.find((ans: any) => ans.questionIndex === i);
          const correctIdx = exam.questions[i].correctOptionIndex;

          if (!ans || ans.selectedOptionIndex === -1) {
            questionStats[i].unattemptedCount += 1;
          } else {
            totalTime += ans.timeTaken || 0;
            questionStats[i].optionsSelected[ans.selectedOptionIndex] += 1;
            
            if (ans.selectedOptionIndex === correctIdx) {
              questionStats[i].correctCount += 1;
            } else {
              questionStats[i].incorrectCount += 1;
            }
          }
        }

        leaderboard.push({
          studentName: a.student.fullName,
          score: a.score,
          totalTime,
          attemptDate: a.completedAt,
        });
      }

      averageScore = totalScoreSum / totalAttempts;
      
      leaderboard.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.totalTime - b.totalTime;
      });
    }

    return NextResponse.json({
      examTitle: exam.courseName,
      totalAttempts,
      averageScore: averageScore.toFixed(1),
      maxScore: exam.questions.length,
      questionStats,
      leaderboard,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Fetch Analytics Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
