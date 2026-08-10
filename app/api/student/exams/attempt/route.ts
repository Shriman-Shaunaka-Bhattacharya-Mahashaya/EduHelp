import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/mongodb';
import Exam from '@/models/Exam';
import ExamAttempt from '@/models/ExamAttempt';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { examId, action, answers } = body;

    if (!examId || !action) {
      return NextResponse.json({ message: 'Missing examId or action' }, { status: 400 });
    }

    await connectToDatabase();
    const exam = await Exam.findById(examId);

    if (!exam) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    if (action === 'start') {
      // Check if scheduled and past window
      if (exam.type === 'scheduled') {
        const now = new Date();
        const scheduledTime = new Date(exam.scheduledFor);
        const loginWindowEnd = new Date(scheduledTime.getTime() + 15 * 60000);

        const existingAttempt = await ExamAttempt.findOne({ exam: examId, student: session.user.id });
        if (existingAttempt) {
          if (existingAttempt.isCompleted) {
            return NextResponse.json({ message: 'You have already completed this scheduled exam' }, { status: 400 });
          }
          // Resume existing in-progress attempt
          const sanitizedQuestions = exam.questions.map((q: any) => ({
            _id: q._id,
            questionText: q.questionText,
            options: q.options
          }));
          return NextResponse.json({ 
            message: 'Resuming attempt', 
            attemptId: existingAttempt._id,
            examDetails: {
              courseName: exam.courseName,
              durationMinutes: exam.durationMinutes,
              questions: sanitizedQuestions
            }
          }, { status: 200 });
        }

        if (now < scheduledTime) {
          return NextResponse.json({ message: 'Exam has not started yet' }, { status: 400 });
        }
        if (now > loginWindowEnd) {
          return NextResponse.json({ message: 'Login window of 15 minutes has passed.' }, { status: 400 });
        }
      }

      // If practice or new scheduled
      // For practice, we can allow multiple attempts. Let's check if there is an IN PROGRESS attempt.
      let attempt = await ExamAttempt.findOne({ exam: examId, student: session.user.id, isCompleted: false });

      if (!attempt) {
        attempt = await ExamAttempt.create({
          exam: examId,
          student: session.user.id,
          answers: [],
        });
      }

      // Return exam details minus the correct answers
      const sanitizedQuestions = exam.questions.map((q: any) => ({
        _id: q._id,
        questionText: q.questionText,
        options: q.options
      }));

      return NextResponse.json({
        message: 'Exam started',
        attemptId: attempt._id,
        examDetails: {
          courseName: exam.courseName,
          durationMinutes: exam.durationMinutes,
          questions: sanitizedQuestions
        }
      }, { status: 200 });

    } else if (action === 'submit') {
      if (!answers || !Array.isArray(answers)) {
        return NextResponse.json({ message: 'Invalid answers array' }, { status: 400 });
      }

      const attempt = await ExamAttempt.findOne({ exam: examId, student: session.user.id, isCompleted: false });

      if (!attempt) {
        return NextResponse.json({ message: 'No active attempt found' }, { status: 400 });
      }

      // Calculate score
      let score = 0;
      const processedAnswers = [];

      for (let i = 0; i < exam.questions.length; i++) {
        const correctIdx = exam.questions[i].correctOptionIndex;
        // Find student answer for this question
        const studentAns = answers.find(a => a.questionIndex === i);

        let selectedOptionIndex = -1;
        let timeTaken = 0;

        if (studentAns) {
          selectedOptionIndex = studentAns.selectedOptionIndex;
          timeTaken = studentAns.timeTaken || 0;
          if (selectedOptionIndex === correctIdx) {
            score += 1;
          }
        }

        processedAnswers.push({
          questionIndex: i,
          selectedOptionIndex,
          timeTaken
        });
      }

      attempt.answers = processedAnswers;
      attempt.score = score;
      attempt.isCompleted = true;
      attempt.completedAt = new Date();
      await attempt.save();

      return NextResponse.json({ message: 'Exam submitted successfully', score }, { status: 200 });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Exam Attempt Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
