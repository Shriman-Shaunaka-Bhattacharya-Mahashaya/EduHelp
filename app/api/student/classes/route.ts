import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import OnlineClass from '../../../../models/OnlineClass';
import User from '../../../../models/User';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const department = user.department;
    const graduationYear = user.graduationYear;

    const baseQuery = {
      $and: [
        {
          $or: [
            { targetDepartment: { $exists: false } },
            { targetDepartment: { $in: [department, ""] } },
          ]
        },
        {
          $or: [
            { targetBatch: { $exists: false } },
            { targetBatch: { $in: [graduationYear] } },
          ]
        },
        {
          $or: [
            { targetStudents: { $size: 0 } },
            { targetStudents: { $exists: false } },
            { targetStudents: session.user.id }
          ]
        },
        // Filter out completed classes, show scheduled and ongoing
        { status: { $in: ['scheduled', 'ongoing'] } }
      ]
    };

    const classes = await OnlineClass.find(baseQuery)
      .populate('instructorId', 'fullName email')
      .sort({ scheduledAt: 1 }) // Earliest first
      .limit(50);

    return NextResponse.json({ classes }, { status: 200 });
  } catch (error: any) {
    console.error("Student Classes Fetch Error:", error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
