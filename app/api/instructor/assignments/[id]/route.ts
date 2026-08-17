import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import Assignment from '../../../../../models/Assignment';
import AssignmentSubmission from '../../../../../models/AssignmentSubmission';
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

const deleteFromCloudinary = (publicId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const assignmentId = params.id;
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) {
      return NextResponse.json({ message: 'Assignment not found' }, { status: 404 });
    }

    if (assignment.instructorId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Delete attachment
    if (assignment.attachment?.publicId) {
      try {
        await deleteFromCloudinary(assignment.attachment.publicId);
      } catch (e) {
        console.error("Failed to delete attachment from Cloudinary", e);
      }
    }

    // Delete all submissions & their attachments
    const submissions = await AssignmentSubmission.find({ assignmentId });
    for (const sub of submissions) {
      if (sub.attachment?.publicId) {
        try {
          await deleteFromCloudinary(sub.attachment.publicId);
        } catch (e) {
          console.error("Failed to delete student submission attachment from Cloudinary", e);
        }
      }
    }
    await AssignmentSubmission.deleteMany({ assignmentId });
    await Assignment.findByIdAndDelete(assignmentId);

    return NextResponse.json({ message: 'Assignment deleted' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const assignmentId = params.id;
    const assignment = await Assignment.findById(assignmentId);

    if (!assignment) return NextResponse.json({ message: 'Assignment not found' }, { status: 404 });
    if (assignment.instructorId.toString() !== session.user.id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const courseName = formData.get('courseName') as string;
    const description = formData.get('description') as string;
    
    const targetDepartment = formData.get('targetDepartment') as string;
    const targetBatchStr = formData.get('targetBatch') as string;
    const deadlineStr = formData.get('deadline') as string;
    const maxMarksStr = formData.get('maxMarks') as string;
    const expireAtStr = formData.get('expireAt') as string;
    
    const attachmentFile = formData.get('attachment') as File | null | string;
    const removeAttachment = formData.get('removeAttachment') === 'true';

    if (!title || !courseName || !description) {
      return NextResponse.json({ message: 'Required fields missing' }, { status: 400 });
    }

    let attachmentData = assignment.attachment;

    if (removeAttachment || (attachmentFile && typeof attachmentFile !== 'string' && attachmentFile.size > 0)) {
      if (assignment.attachment?.publicId) {
        try {
          await deleteFromCloudinary(assignment.attachment.publicId);
        } catch (e) {
          console.error("Failed to delete old attachment", e);
        }
      }
      
      attachmentData = undefined;

      if (attachmentFile && typeof attachmentFile !== 'string' && attachmentFile.size > 0) {
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
          return NextResponse.json({ message: 'Cloudinary upload failed' }, { status: 500 });
        }
      }
    }

    assignment.title = title;
    assignment.courseName = courseName;
    assignment.description = description;
    assignment.targetDepartment = targetDepartment || undefined;
    assignment.targetBatch = targetBatchStr ? parseInt(targetBatchStr) : undefined;
    assignment.deadline = deadlineStr ? new Date(deadlineStr) : undefined;
    assignment.maxMarks = maxMarksStr ? parseInt(maxMarksStr) : undefined;
    
    if (expireAtStr) {
      assignment.expireAt = new Date(expireAtStr);
    }
    
    if (attachmentData) {
      assignment.attachment = attachmentData;
    } else if (removeAttachment || (attachmentFile && typeof attachmentFile !== 'string')) {
      assignment.attachment = undefined;
    }

    await assignment.save();
    return NextResponse.json(assignment, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
