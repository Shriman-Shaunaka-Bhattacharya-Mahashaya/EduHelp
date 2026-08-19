import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import Content from '../../../../../models/Content';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const courses = await Content.distinct('course', { 
      instructorId: session.user.id,
      expireAt: { $gt: new Date() }
    });

    return NextResponse.json({ courses }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Courses Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
