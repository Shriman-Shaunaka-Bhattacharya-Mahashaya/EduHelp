import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import connectDB from '../../../../../../lib/mongodb';
import Assignment from '../../../../../../models/Assignment';
import AssignmentSubmission from '../../../../../../models/AssignmentSubmission';

export async function PUT(req: Request, context: { params: Promise<{ submissionId: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const submissionId = params.submissionId;
    const submission = await AssignmentSubmission.findById(submissionId);

    if (!submission) return NextResponse.json({ message: 'Submission not found' }, { status: 404 });

    // Ensure instructor owns the assignment
    const assignment = await Assignment.findById(submission.assignmentId);
    if (!assignment) return NextResponse.json({ message: 'Associated assignment not found' }, { status: 404 });
    if (assignment.instructorId.toString() !== session.user.id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { marksAwarded, feedback } = await req.json();

    // Max marks validation
    if (marksAwarded !== undefined && marksAwarded !== null) {
      if (assignment.maxMarks && marksAwarded > assignment.maxMarks) {
        return NextResponse.json({ message: `Marks cannot exceed max marks (${assignment.maxMarks})` }, { status: 400 });
      }
    }

    submission.marksAwarded = marksAwarded;
    submission.feedback = feedback;
    
    await submission.save();

    return NextResponse.json({ submission }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
