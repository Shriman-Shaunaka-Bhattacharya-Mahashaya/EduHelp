import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import Message from '../../../../models/Message';
import mongoose from 'mongoose';

export async function GET(req: Request, props: { params: Promise<{ userId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await props.params;
    const currentUserId = session.user.id;
    const contactId = userId;

    await connectDB();

    // Mark all unread messages from this contact as read
    await Message.updateMany(
      { senderId: contactId, receiverId: currentUserId, read: false },
      { $set: { read: true } }
    );

    // Fetch conversation history
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: contactId },
        { senderId: contactId, receiverId: currentUserId }
      ]
    }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Messages Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, props: { params: Promise<{ userId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await req.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ message: 'Message content cannot be empty' }, { status: 400 });
    }

    const { userId } = await props.params;
    const currentUserId = session.user.id;
    const contactId = userId;

    await connectDB();

    const newMessage = await Message.create({
      senderId: currentUserId,
      receiverId: contactId,
      content: content.trim()
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error: any) {
    console.error('Send Message Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
