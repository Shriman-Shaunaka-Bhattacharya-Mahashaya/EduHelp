import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]/route';
import connectDB from '../../../../../lib/mongodb';
import Content from '../../../../../models/Content';
import DocumentChunk from '../../../../../models/DocumentChunk';
import { v2 as cloudinary } from 'cloudinary';
import { generateEmbedding } from '../../../../../lib/embeddings';

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
        public_id: `content/${Date.now()}_${originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '')}`,
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
    const contentId = params.id;
    const content = await Content.findById(contentId);

    if (!content) {
      return NextResponse.json({ message: 'Content not found' }, { status: 404 });
    }

    if (content.instructorId.toString() !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (content.attachment?.publicId) {
      try {
        await deleteFromCloudinary(content.attachment.publicId);
      } catch (e) {
        console.error("Failed to delete attachment from Cloudinary", e);
      }
    }

    // Explicit controller-level teardown for embeddings
    await DocumentChunk.deleteMany({ contentId });
    await Content.findByIdAndDelete(contentId);

    return NextResponse.json({ message: 'Content deleted' }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE Content Error:", error);
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
    const contentId = params.id;
    const content = await Content.findById(contentId);

    if (!content) return NextResponse.json({ message: 'Content not found' }, { status: 404 });
    if (content.instructorId.toString() !== session.user.id) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const course = formData.get('course') as string;
    const description = formData.get('description') as string;
    const tagsRaw = formData.get('tags') as string;
    
    const targetDepartment = formData.get('targetDepartment') as string;
    const targetBatchStr = formData.get('targetBatch') as string;
    const expireAtStr = formData.get('expireAt') as string;
    
    const attachmentFile = formData.get('attachment') as File | null | string;

    if (!title || !course || !description) {
      return NextResponse.json({ message: 'Title, Course, and Description are required' }, { status: 400 });
    }

    let attachmentData = content.attachment;

    if (attachmentFile && typeof attachmentFile !== 'string' && attachmentFile.size > 0) {
      if (content.attachment?.publicId) {
        try {
          await deleteFromCloudinary(content.attachment.publicId);
        } catch (e) {
          console.error("Failed to delete old attachment", e);
        }
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
        return NextResponse.json({ message: 'Cloudinary upload failed' }, { status: 500 });
      }
    }

    content.title = title;
    content.course = course;
    content.description = description;
    content.tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];
    content.targetDepartment = targetDepartment || undefined;
    content.targetBatch = targetBatchStr ? parseInt(targetBatchStr) : undefined;
    
    if (expireAtStr) {
      content.expireAt = new Date(expireAtStr);
    }
    
    if (attachmentData) {
      content.attachment = attachmentData;
    }
    
    // Generate new metadata embedding
    try {
      const metaString = `Course: ${content.course}. Title: ${content.title}. Tags: ${content.tags.join(', ')}. Description: ${content.description}`;
      const embedding = await generateEmbedding(metaString);
      if (embedding && embedding.length > 0) {
        content.embedding = embedding;
      }
    } catch (e) {
      console.error("Failed to generate metadata embedding on update:", e);
    }

    await content.save();
    return NextResponse.json(content, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
