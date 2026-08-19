import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import Announcement from '../../../../models/Announcement';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer: Buffer, originalFilename: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { 
        resource_type: 'raw', // Use raw for documents (pdf, docx, etc)
        public_id: `announcements/${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const message = formData.get('message') as string;
    const targetDepartment = formData.get('targetDepartment') as string;
    const targetBatchStr = formData.get('targetBatch') as string;
    const attachmentFile = formData.get('attachment') as File | null;

    if (!title || !message) {
      return NextResponse.json({ message: 'Title and message are required' }, { status: 400 });
    }

    let attachmentData = null;

    if (attachmentFile && attachmentFile.size > 0) {
      if (!process.env.CLOUDINARY_CLOUD_NAME) {
         return NextResponse.json({ message: 'Cloudinary environment variables are missing. Cannot upload attachment.' }, { status: 500 });
      }

      const bytes = await attachmentFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      try {
        const result = await uploadToCloudinary(buffer, attachmentFile.name);
        attachmentData = {
          filename: attachmentFile.name,
          url: result.secure_url,
          publicId: result.public_id
        };
      } catch (uploadErr) {
        console.error("Cloudinary upload error:", uploadErr);
        return NextResponse.json({ message: 'Failed to upload attachment to Cloudinary' }, { status: 500 });
      }
    }

    const targetBatch = targetBatchStr ? parseInt(targetBatchStr) : undefined;

    const newAnnouncement = await Announcement.create({
      title,
      message,
      instructorId: session.user.id,
      targetDepartment: targetDepartment || undefined,
      targetBatch: targetBatch || undefined,
      attachment: attachmentData || undefined,
      expireAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months from now
    });

    return NextResponse.json(newAnnouncement, { status: 201 });

  } catch (error: any) {
    console.error('Create Announcement Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const skip = (page - 1) * limit;

    const query = { 
      instructorId: session.user.id,
      expireAt: { $gt: new Date() }
    };

    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalDocs = await Announcement.countDocuments(query);
    const hasMore = totalDocs > skip + limit;

    return NextResponse.json({ announcements, hasMore }, { status: 200 });

  } catch (error: any) {
    console.error('Fetch Announcements Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
