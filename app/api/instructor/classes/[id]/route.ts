import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import OnlineClass from '../../../../../models/OnlineClass';

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const classId = params.id;
    const body = await req.json();

    const { status, title, description, scheduledAt, durationMinutes } = body;

    const existingClass = await OnlineClass.findById(classId);

    if (!existingClass) {
      return NextResponse.json({ message: 'Class not found' }, { status: 404 });
    }

    if (existingClass.instructorId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (status) existingClass.status = status;
    if (title) existingClass.title = title;
    if (description) existingClass.description = description;
    if (scheduledAt) existingClass.scheduledAt = new Date(scheduledAt);
    if (durationMinutes) existingClass.durationMinutes = durationMinutes;

    await existingClass.save();

    return NextResponse.json({ message: 'Class updated', class: existingClass }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const classId = params.id;

    const existingClass = await OnlineClass.findById(classId);

    if (!existingClass) {
      return NextResponse.json({ message: 'Class not found' }, { status: 404 });
    }

    if (existingClass.instructorId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    await OnlineClass.findByIdAndDelete(classId);

    return NextResponse.json({ message: 'Class deleted' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
