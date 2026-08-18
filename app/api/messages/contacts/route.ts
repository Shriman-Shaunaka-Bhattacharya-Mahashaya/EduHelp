import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import User from '../../../../models/User';
import Message from '../../../../models/Message';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const targetRole = currentUser.role === 'student' ? 'instructor' : 'student';

    // Find all users of opposite role
    // In a very large app, you'd only return users they've talked to, plus a search bar.
    // For this context, we'll fetch all and sort by recent activity.
    const contacts = await User.find({ role: targetRole }).select('fullName email department role instructorId rollNumber').lean();

    const currentUserId = new mongoose.Types.ObjectId(session.user.id);

    // Get last message and unread count for each contact
    const enrichedContacts = await Promise.all(contacts.map(async (contact: any) => {
      const contactId = new mongoose.Types.ObjectId(contact._id);

      const lastMessage = await Message.findOne({
        $or: [
          { senderId: currentUserId, receiverId: contactId },
          { senderId: contactId, receiverId: currentUserId }
        ]
      }).sort({ createdAt: -1 }).lean();

      const unreadCount = await Message.countDocuments({
        senderId: contactId,
        receiverId: currentUserId,
        read: false
      });

      return {
        ...contact,
        lastMessage: lastMessage || null,
        unreadCount
      };
    }));

    // Sort: Contacts with conversations first (most recent), then alphabetically by name
    enrichedContacts.sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
      }
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    return NextResponse.json({ contacts: enrichedContacts }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Contacts Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
