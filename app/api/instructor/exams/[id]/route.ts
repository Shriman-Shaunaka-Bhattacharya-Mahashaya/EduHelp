import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import Exam from '../../../../../models/Exam';

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const examId = params.id;
    const exam = await Exam.findById(examId);

    if (!exam) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    // Verify ownership
    if (exam.instructor.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You can only delete your own exams.' }, { status: 403 });
    }

    await Exam.findByIdAndDelete(examId);

    return NextResponse.json({ message: 'Exam deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete Exam Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const examId = params.id;
    const exam = await Exam.findById(examId);

    if (!exam) {
      return NextResponse.json({ message: 'Exam not found' }, { status: 404 });
    }

    // Verify ownership
    if (exam.instructor.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You can only edit your own exams.' }, { status: 403 });
    }

    const updates = await req.json();

    // Ensure they are not trying to update questions via this route
    delete updates.questions;
    
    // Process targets (null out if empty strings)
    if (updates.targetDepartment === "") updates.targetDepartment = null;
    if (updates.targetBatch === "") updates.targetBatch = null;

    if (updates.expireAt) {
      updates.expireAt = new Date(updates.expireAt);
    }

    const updatedExam = await Exam.findByIdAndUpdate(examId, updates, { new: true });

    return NextResponse.json({ exam: updatedExam }, { status: 200 });
  } catch (error: any) {
    console.error('Update Exam Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
