import mongoose from 'mongoose';
import Content from '../models/Content';
import { generateEmbedding } from '../lib/embeddings';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

async function backfill() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected to MongoDB.");

    const contents = await Content.find({ embedding: { $exists: false } });
    console.log(`Found ${contents.length} contents missing embeddings.`);

    let successCount = 0;
    let failCount = 0;

    for (const content of contents) {
      try {
        const metaString = `Course: ${content.course}. Title: ${content.title}. Tags: ${content.tags.join(', ')}. Description: ${content.description}`;
        const embedding = await generateEmbedding(metaString);
        
        if (embedding && embedding.length > 0) {
          content.embedding = embedding;
          await content.save();
          successCount++;
          console.log(`Updated content: ${content.title}`);
        } else {
          failCount++;
          console.error(`Generated empty embedding for: ${content.title}`);
        }
      } catch (e) {
        failCount++;
        console.error(`Failed to update content: ${content.title}`, e);
      }
    }

    console.log(`Backfill complete. Success: ${successCount}, Failed: ${failCount}`);
    process.exit(0);
  } catch (err) {
    console.error("Backfill script error:", err);
    process.exit(1);
  }
}

backfill();
