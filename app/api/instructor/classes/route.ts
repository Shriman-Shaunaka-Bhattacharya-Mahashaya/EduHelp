import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import OnlineClass from '../../../../models/OnlineClass';
import { parseClassDetails } from '@/lib/onlineClasses';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = parseClassDetails(body);
    if ('error' in parsed) return NextResponse.json({ message: parsed.error }, { status: 400 });
    await connectDB();
    const newClass = new OnlineClass({
      ...parsed.data,
      instructorId: session.user.id,
      status: 'scheduled'
    });

    await newClass.save();

    return NextResponse.json({ message: 'Class scheduled successfully', class: newClass }, { status: 201 });
  } catch (error: any) {
    console.error("Create Online Class Error:", error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const classes = await OnlineClass.find({ instructorId: session.user.id })
      .sort({ scheduledAt: -1 })
      .limit(50); // Fetch latest 50 classes for now

    return NextResponse.json({ classes }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
