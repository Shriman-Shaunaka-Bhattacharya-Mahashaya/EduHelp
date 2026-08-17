import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '../../../../lib/mongodb';
import Content from '../../../../models/Content';
import DocumentChunk from '../../../../models/DocumentChunk';
import { v2 as cloudinary } from 'cloudinary';
import { extractTextFromBuffer, chunkText } from '../../../../lib/documentParser';
import { generateEmbedding } from '../../../../lib/embeddings';

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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const content = await Content.find({ 
      instructorId: session.user.id,
      expireAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    return NextResponse.json({ content }, { status: 200 });
  } catch (error: any) {
    console.error('Fetch Content Error:', error);
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
    const course = formData.get('course') as string;
    const description = formData.get('description') as string;
    const tagsRaw = formData.get('tags') as string;
    
    const targetDepartment = formData.get('targetDepartment') as string;
    const targetBatchStr = formData.get('targetBatch') as string;
    const attachmentFile = formData.get('attachment') as File | null;
    const expireAtStr = formData.get('expireAt') as string;

    if (!title || !course || !description || !attachmentFile || attachmentFile.size === 0) {
      return NextResponse.json({ message: 'Title, Course, Description, and Attachment are required' }, { status: 400 });
    }

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];

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
      return NextResponse.json({ message: 'Failed to upload attachment to Cloudinary' }, { status: 500 });
    }

    let expireAt = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000); // 6 months
    if (expireAtStr) {
      expireAt = new Date(expireAtStr);
    }

    const newContent = await Content.create({
      title,
      course,
      description,
      tags,
      instructorId: session.user.id,
      targetDepartment: targetDepartment || undefined,
      targetBatch: targetBatchStr ? parseInt(targetBatchStr) : undefined,
      attachment: attachmentData,
      expireAt
    });

    // Generate Embeddings synchronously before returning
    try {
      const rawText = await extractTextFromBuffer(buffer, attachmentFile.name);
      const chunks = chunkText(rawText);
      
      const chunkDocs = [];
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk);
        chunkDocs.push({
          contentId: newContent._id,
          text: chunk,
          embedding
        });
      }
      
      if (chunkDocs.length > 0) {
        await DocumentChunk.insertMany(chunkDocs);
      }
    } catch (embError) {
      console.error("Failed to generate embeddings for new content:", embError);
      // We don't fail the whole request, but we log the error. The content is still saved.
    }

    return NextResponse.json(newContent, { status: 201 });
  } catch (error: any) {
    console.error('Create Content Error:', error);
    return NextResponse.json({ message: 'Server error', error: error.message }, { status: 500 });
  }
}
