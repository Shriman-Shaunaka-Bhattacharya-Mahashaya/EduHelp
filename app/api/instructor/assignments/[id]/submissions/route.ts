import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import connectDB from '../../../../../../lib/mongodb';
import Assignment from '../../../../../../models/Assignment';
import AssignmentSubmission from '../../../../../../models/AssignmentSubmission';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const assignmentId = params.id;
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) return NextResponse.json({ message: 'Assignment not found' }, { status: 404 });
    if (assignment.instructorId.toString() !== session.user.id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    // Populate studentId to get their name, email, rollNumber, etc.
    const submissions = await AssignmentSubmission.find({ assignmentId })
      .populate('studentId', 'fullName email rollNumber department registrationNumber')
      .sort({ submittedAt: -1 });

    return NextResponse.json({ submissions }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
