import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Exam from '../../../../models/Exam';
import Announcement from '../../../../models/Announcement';
import Assignment from '../../../../models/Assignment';
import AssignmentSubmission from '../../../../models/AssignmentSubmission';
import Content from '../../../../models/Content';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const deleteFromCloudinary = (publicId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

export async function GET(req: Request) {
  try {
    // Basic security for Vercel Cron
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    await connectDB();
    const now = new Date();

    // 1. Cleanup Exams
    const expiredExams = await Exam.find({ expireAt: { $lte: now } });
    const examIds = expiredExams.map(e => e._id);
    await Exam.deleteMany({ _id: { $in: examIds } });

    // 2. Cleanup Announcements
    const expiredAnnouncements = await Announcement.find({ expireAt: { $lte: now } });
    for (const ann of expiredAnnouncements) {
      if (ann.attachment?.publicId) {
        try { await deleteFromCloudinary(ann.attachment.publicId); } catch (e) { console.error("Cloudinary del error", e); }
      }
    }
    const annIds = expiredAnnouncements.map(a => a._id);
    await Announcement.deleteMany({ _id: { $in: annIds } });

    // 3. Cleanup Assignments and their Submissions
    const expiredAssignments = await Assignment.find({ expireAt: { $lte: now } });
    for (const assign of expiredAssignments) {
      if (assign.attachment?.publicId) {
        try { await deleteFromCloudinary(assign.attachment.publicId); } catch (e) { console.error("Cloudinary del error", e); }
      }
      
      // Delete associated submissions
      const submissions = await AssignmentSubmission.find({ assignmentId: assign._id });
      for (const sub of submissions) {
        if (sub.attachment?.publicId) {
          try { await deleteFromCloudinary(sub.attachment.publicId); } catch (e) { console.error("Cloudinary del error", e); }
        }
      }
      await AssignmentSubmission.deleteMany({ assignmentId: assign._id });
    }
    const assignIds = expiredAssignments.map(a => a._id);
    await Assignment.deleteMany({ _id: { $in: assignIds } });

    // 4. Cleanup Content
    const expiredContent = await Content.find({ expireAt: { $lte: now } });
    for (const c of expiredContent) {
      if (c.attachment?.publicId) {
        try { await deleteFromCloudinary(c.attachment.publicId); } catch (e) { console.error("Cloudinary del error", e); }
      }
    }
    const contentIds = expiredContent.map(c => c._id);
    await Content.deleteMany({ _id: { $in: contentIds } });

    return NextResponse.json({
      message: 'Cleanup completed',
      deletedExams: examIds.length,
      deletedAnnouncements: annIds.length,
      deletedAssignments: assignIds.length,
      deletedContent: contentIds.length,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Cron Cleanup Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
