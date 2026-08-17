import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import Content from '../../../../models/Content';
import User from '../../../../models/User';

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

    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search');

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

    if (searchQuery) {
      baseQuery.$text = { $search: searchQuery };
    }

    let queryObj = Content.find(baseQuery)
      .populate('instructorId', 'fullName email');

    // If text searching, we can sort by text score relevance, else sort by date
    if (searchQuery) {
      queryObj = queryObj.select({ score: { $meta: "textScore" } }).sort({ score: { $meta: "textScore" } });
    } else {
      queryObj = queryObj.sort({ createdAt: -1 });
    }

    const content = await queryObj;

    return NextResponse.json({ content }, { status: 200 });

  } catch (error: any) {
    console.error('Fetch Student Content Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
