import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import Content from '../../../../../models/Content';
import User from '../../../../../models/User';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const user = await User.findById(session.user.id);
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const department = user.department;
    const graduationYear = user.graduationYear;

    const baseQuery: any = {
      $and: [
        {
          $or: [
            { targetDepartment: { $in: [null, department, ""] } },
            { targetBatch: { $in: [null, graduationYear] } },
          ]
        },
        { expireAt: { $gt: new Date() } }
      ]
    };

    const courses = await Content.distinct('course', baseQuery);

    return NextResponse.json({ courses }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Courses Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
