import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/mongodb';
import Content from '../../../../models/Content';
import DocumentChunk from '../../../../models/DocumentChunk';
import { extractTextFromBuffer, chunkText } from '../../../../lib/documentParser';
import { generateEmbedding } from '../../../../lib/embeddings';

export async function POST(req: Request) {
  try {
    // In a real app, protect this route with Admin middleware.
    // For now, we allow POST to run the one-off job.
    
    await connectDB();
    
    const contents = await Content.find({});
    let processedCount = 0;
    let failedCount = 0;

    for (const content of contents) {
      // Check if we already have chunks for this content
      const existingChunks = await DocumentChunk.countDocuments({ contentId: content._id });
      if (existingChunks > 0) {
        // Skip if already processed, or could delete and re-process
        continue;
      }

      if (!content.attachment || !content.attachment.url) {
        failedCount++;
        continue;
      }

      try {
        console.log(`Processing content: ${content.title}`);
        
        // Fetch the file from Cloudinary URL
        const fileRes = await fetch(content.attachment.url);
        if (!fileRes.ok) throw new Error("Failed to fetch file from Cloudinary");
        
        const arrayBuffer = await fileRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Extract Text
        const rawText = await extractTextFromBuffer(buffer, content.attachment.filename);
        
        // Chunk Text
        const chunks = chunkText(rawText);
        
        // Generate Embeddings and Save
        const chunkDocs = [];
        for (const chunk of chunks) {
          const embedding = await generateEmbedding(chunk);
          chunkDocs.push({
            contentId: content._id,
            text: chunk,
            embedding
          });
        }
        
        if (chunkDocs.length > 0) {
          await DocumentChunk.insertMany(chunkDocs);
        }
        
        processedCount++;
      } catch (e) {
        console.error(`Failed to process content ${content._id}:`, e);
        failedCount++;
      }
    }

    return NextResponse.json({
      message: "Retroactive processing complete",
      processedCount,
      failedCount,
      totalFound: contents.length
    }, { status: 200 });

  } catch (error: any) {
    console.error("Retroactive processing error:", error);
    return NextResponse.json({ message: "Server error", error: error.message }, { status: 500 });
  }
}
