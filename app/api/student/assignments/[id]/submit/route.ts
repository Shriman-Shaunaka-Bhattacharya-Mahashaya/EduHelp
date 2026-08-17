import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import connectDB from '../../../../../../lib/mongodb';
import Assignment from '../../../../../../models/Assignment';
import AssignmentSubmission from '../../../../../../models/AssignmentSubmission';
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
        public_id: `submissions/${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
};

const deleteFromCloudinary = (publicId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const assignmentId = params.id;
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) return NextResponse.json({ message: 'Assignment not found' }, { status: 404 });

    // Check deadline
    if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
      return NextResponse.json({ message: 'Deadline has passed. Late submissions are not allowed.' }, { status: 400 });
    }

    // Check if already submitted
    const existingSubmission = await AssignmentSubmission.findOne({ assignmentId, studentId: session.user.id });
    if (existingSubmission) {
      return NextResponse.json({ message: 'You have already submitted this assignment.' }, { status: 400 });
    }

    const formData = await req.formData();
    const attachmentFile = formData.get('file') as File | null;

    if (!attachmentFile || attachmentFile.size === 0) {
      return NextResponse.json({ message: 'File is required' }, { status: 400 });
    }

    const bytes = await attachmentFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let attachmentData;
    try {
      const result = await uploadToCloudinary(buffer, attachmentFile.name);
      attachmentData = {
        filename: attachmentFile.name,
        url: result.secure_url,
        publicId: result.public_id
      };
    } catch (uploadErr) {
      console.error("Cloudinary upload error:", uploadErr);
      return NextResponse.json({ message: 'Failed to upload file' }, { status: 500 });
    }

    const submission = await AssignmentSubmission.create({
      assignmentId,
      studentId: session.user.id,
      attachment: attachmentData
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error: any) {
    console.error('Submit Assignment Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const assignmentId = params.id;
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) return NextResponse.json({ message: 'Assignment not found' }, { status: 404 });

    // Check deadline
    if (assignment.deadline && new Date() > new Date(assignment.deadline)) {
      return NextResponse.json({ message: 'Deadline has passed. You cannot unsubmit now.' }, { status: 400 });
    }

    const submission = await AssignmentSubmission.findOne({ assignmentId, studentId: session.user.id });
    if (!submission) {
      return NextResponse.json({ message: 'Submission not found' }, { status: 404 });
    }

    // Delete attachment from Cloudinary
    if (submission.attachment?.publicId) {
      try {
        await deleteFromCloudinary(submission.attachment.publicId);
      } catch (e) {
        console.error("Failed to delete attachment from Cloudinary", e);
      }
    }

    await AssignmentSubmission.findByIdAndDelete(submission._id);

    return NextResponse.json({ message: 'Submission deleted' }, { status: 200 });

  } catch (error: any) {
    console.error('Delete Submission Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
