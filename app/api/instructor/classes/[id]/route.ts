import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import OnlineClass from '../../../../../models/OnlineClass';
import { normalizeMeetUrl, parseClassDetails } from '@/lib/onlineClasses';

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

    const parsed = parseClassDetails(body, true);
    if ('error' in parsed) return NextResponse.json({ message: parsed.error }, { status: 400 });
    const { status } = body;
    if (status !== undefined && !['scheduled', 'ongoing', 'completed'].includes(status)) {
      return NextResponse.json({ message: 'Invalid class status' }, { status: 400 });
    }

    const existingClass = await OnlineClass.findById(classId);

    if (!existingClass) {
      return NextResponse.json({ message: 'Class not found' }, { status: 404 });
    }

    if (existingClass.instructorId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (status === 'ongoing' && !normalizeMeetUrl(parsed.data.meetingUrl ?? existingClass.meetingUrl)) {
      return NextResponse.json({ message: 'Add a Google Meet link using Edit Class before starting this class' }, { status: 409 });
    }
    Object.assign(existingClass, parsed.data);
    if (status) existingClass.status = status;
    // Allow old classes without a Meet link to be marked completed.
    await existingClass.save({ validateModifiedOnly: true });

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
