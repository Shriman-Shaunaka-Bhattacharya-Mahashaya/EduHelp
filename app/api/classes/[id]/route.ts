import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import OnlineClass from '../../../../models/OnlineClass';
import { generateToken04 } from '../../../../lib/zego';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const params = await context.params;
    const classId = params.id;

    const classData = await OnlineClass.findById(classId);

    if (!classData) {
      return NextResponse.json({ message: 'Class not found' }, { status: 404 });
    }

    // Only allow students if the class is ongoing
    if (session.user.role === 'student' && classData.status !== 'ongoing') {
      return NextResponse.json({ message: 'Class has not started yet' }, { status: 403 });
    }

    const appID = parseInt(process.env.ZEGO_APP_ID || "0");
    const serverSecret = process.env.ZEGO_SERVER_SECRET;

    if (!appID || !serverSecret) {
       return NextResponse.json({ message: 'Server configuration missing' }, { status: 500 });
    }

    const userId = session.user.id;
    const effectiveTimeInSeconds = 7200;

    const payloadObject = {
      room_id: classId,
      privilege: {
        1: 1, // Login Room
        2: 1  // Publish Stream
      },
      stream_id_list: null
    };
    const payload = JSON.stringify(payloadObject);

    // Securely generate token on backend
    const token = generateToken04(appID, userId, serverSecret, effectiveTimeInSeconds, payload);

    return NextResponse.json({ 
      status: classData.status, 
      title: classData.title,
      appID: appID,
      token: token,
      userID: userId
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching class:", error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
