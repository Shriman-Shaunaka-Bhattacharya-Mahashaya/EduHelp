import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import Assignment from '../../../../models/Assignment';
import AssignmentSubmission from '../../../../models/AssignmentSubmission';
import User from '../../../../models/User';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Fetch user details to get department and batch
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const department = user.department;
    const batch = user.graduationYear;

    // Find assignments where target matches student or is null (general)
    const assignments = await Assignment.find({
      $and: [
        { targetDepartment: { $in: [null, department, ""] } },
        { targetBatch: { $in: [null, batch] } },
        { expireAt: { $gt: new Date() } }
      ]
    }).sort({ createdAt: -1 });

    // Also fetch their submissions to determine status
    const submissions = await AssignmentSubmission.find({ studentId: session.user.id });

    return NextResponse.json({ assignments, submissions }, { status: 200 });

  } catch (error: any) {
    console.error('Fetch Student Assignments Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
