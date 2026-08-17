import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import Assignment from '../../../../models/Assignment';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (buffer: Buffer, originalFilename: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { 
        resource_type: 'raw', 
        public_id: `assignments/${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
};

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const assignments = await Assignment.find({ 
      instructorId: session.user.id,
      expireAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    return NextResponse.json({ assignments }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Assignments Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const courseName = formData.get('courseName') as string;
    const description = formData.get('description') as string;
    
    const targetDepartment = formData.get('targetDepartment') as string;
    const targetBatchStr = formData.get('targetBatch') as string;
    const deadlineStr = formData.get('deadline') as string;
    const maxMarksStr = formData.get('maxMarks') as string;
    const attachmentFile = formData.get('attachment') as File | null;

    if (!title || !courseName || !description) {
      return NextResponse.json({ message: 'Title, Course Name, and Description are required' }, { status: 400 });
    }

    let attachmentData;

    if (attachmentFile && attachmentFile.size > 0) {
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

    const newAssignment = await Assignment.create({
      title,
      courseName,
      description,
      instructorId: session.user.id,
      targetDepartment: targetDepartment || undefined,
      targetBatch: targetBatchStr ? parseInt(targetBatchStr) : undefined,
      deadline: deadlineStr ? new Date(deadlineStr) : undefined,
      maxMarks: maxMarksStr ? parseInt(maxMarksStr) : undefined,
      attachment: attachmentData,
      expireAt: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months from now
    });

    return NextResponse.json(newAssignment, { status: 201 });
  } catch (error: any) {
    console.error('Create Assignment Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
