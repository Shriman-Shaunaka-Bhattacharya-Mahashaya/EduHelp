import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import Announcement from '../../../../models/Announcement';
import User from '../../../../models/User';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get the full student details to know their department and batch
    const student = await User.findById(session.user.id);
    if (!student) {
      return NextResponse.json({ message: 'Student not found' }, { status: 404 });
    }

    const { department, graduationYear } = student;

    // Filter announcements:
    // targetDepartment can be null/missing (General) OR match student's department
    // targetBatch can be null/missing (General) OR match student's batch
    const announcements = await Announcement.find({
      targetDepartment: { $in: [null, department] },
      targetBatch: { $in: [null, graduationYear] }
    })
    .populate('instructorId', 'fullName email')
    .sort({ createdAt: -1 });

    return NextResponse.json({ announcements }, { status: 200 });

  } catch (error: any) {
    console.error('Fetch Student Announcements Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
