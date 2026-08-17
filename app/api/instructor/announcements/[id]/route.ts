import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import Announcement from '../../../../../models/Announcement';
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
        resource_type: 'raw', 
        public_id: `announcements/${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`,
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

    const announcementId = params.id;
    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return NextResponse.json({ message: 'Announcement not found' }, { status: 404 });
    }

    if (announcement.instructorId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You can only delete your own announcements.' }, { status: 403 });
    }

    // Delete attachment from Cloudinary if it exists
    if (announcement.attachment?.publicId) {
      try {
        await deleteFromCloudinary(announcement.attachment.publicId);
      } catch (err) {
        console.error("Failed to delete Cloudinary attachment", err);
        // We log the error but still proceed to delete the DB record.
      }
    }

    await Announcement.findByIdAndDelete(announcementId);

    return NextResponse.json({ message: 'Announcement deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Delete Announcement Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
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
    const announcementId = params.id;
    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return NextResponse.json({ message: 'Announcement not found' }, { status: 404 });
    }

    if (announcement.instructorId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden: You can only edit your own announcements.' }, { status: 403 });
    }

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const message = formData.get('message') as string;
    const targetDepartment = formData.get('targetDepartment') as string;
    const targetBatchStr = formData.get('targetBatch') as string;
    const expireAtStr = formData.get('expireAt') as string;
    const attachmentFile = formData.get('attachment') as File | null | string;
    const removeAttachment = formData.get('removeAttachment') === 'true';

    if (!title || !message) {
      return NextResponse.json({ message: 'Title and message are required' }, { status: 400 });
    }

    let attachmentData = announcement.attachment;

    // Handle new attachment upload OR explicit removal
    if (removeAttachment || (attachmentFile && typeof attachmentFile !== 'string' && attachmentFile.size > 0)) {
      
      // If there's an old attachment, delete it from Cloudinary
      if (announcement.attachment?.publicId) {
        try {
          await deleteFromCloudinary(announcement.attachment.publicId);
        } catch (err) {
          console.error("Failed to delete old Cloudinary attachment", err);
        }
      }
      
      attachmentData = undefined; // reset attachment

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
          console.error("Cloudinary upload error:", uploadErr);
          return NextResponse.json({ message: 'Failed to upload new attachment to Cloudinary' }, { status: 500 });
        }
      }
    }

    const targetBatch = targetBatchStr ? parseInt(targetBatchStr) : null;

    announcement.title = title;
    announcement.message = message;
    announcement.targetDepartment = targetDepartment || null;
    announcement.targetBatch = targetBatch;
    
    if (expireAtStr) {
      announcement.expireAt = new Date(expireAtStr);
    }
    
    // Using `set` because attachment is an object and setting it to undefined needs $unset in mongoose sometimes
    if (attachmentData) {
      announcement.attachment = attachmentData;
    } else if (removeAttachment || (attachmentFile && typeof attachmentFile !== 'string')) {
      announcement.attachment = undefined;
    }

    await announcement.save();

    return NextResponse.json(announcement, { status: 200 });

  } catch (error: any) {
    console.error('Update Announcement Error:', error);
    return NextResponse.json(
      { message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}
