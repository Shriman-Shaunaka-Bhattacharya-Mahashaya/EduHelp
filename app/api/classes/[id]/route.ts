import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import OnlineClass from '@/models/OnlineClass';
import User from '@/models/User';
import { canStudentJoinClass, normalizeMeetUrl } from '@/lib/onlineClasses';

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['student', 'instructor'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const { id } = await context.params;
    const onlineClass = await OnlineClass.findById(id);
    if (!onlineClass) return NextResponse.json({ message: 'Class not found' }, { status: 404 });
    const canManage = session.user.role === 'instructor' && onlineClass.instructorId.toString() === session.user.id;
    if (session.user.role === 'instructor' && !canManage) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (session.user.role === 'student') {
      const student = await User.findById(session.user.id);
      if (!student || !canStudentJoinClass(onlineClass, { id: session.user.id, department: student.department, graduationYear: student.graduationYear })) {
        return NextResponse.json({ message: 'This class is not assigned to you' }, { status: 403 });
      }
      if (onlineClass.status !== 'ongoing') {
        return NextResponse.json({ message: onlineClass.status === 'completed' ? 'This class has ended' : 'Class has not started yet' }, { status: 403 });
      }
    }
    const meetingUrl = normalizeMeetUrl(onlineClass.meetingUrl);
    if (!meetingUrl) return NextResponse.json({ message: 'The instructor needs to add a Google Meet link to this class' }, { status: 409 });
    return NextResponse.json({
      title: onlineClass.title,
      description: onlineClass.description,
      status: onlineClass.status,
      meetingUrl,
      canManage,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error fetching online class:', error);
    return NextResponse.json({ message: 'Unable to load this class. Please try again.' }, { status: 500 });
  }
}
