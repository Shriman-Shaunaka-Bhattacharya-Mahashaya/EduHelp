import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import Message from '../../../../models/Message';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const count = await Message.countDocuments({
      receiverId: session.user.id,
      read: false
    });

    return NextResponse.json({ unreadCount: count }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Unread Messages Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
