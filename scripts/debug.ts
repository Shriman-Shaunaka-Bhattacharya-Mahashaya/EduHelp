import mongoose from 'mongoose';
import Content from '../models/Content';
import { generateEmbedding } from '../lib/embeddings';

const MONGODB_URI = process.env.MONGODB_URI;

async function debug() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected to DB");

    const total = await Content.countDocuments();
    const withEmbedding = await Content.countDocuments({ embedding: { $exists: true, $ne: [] } });
    console.log(`Total contents: ${total}, with embedding: ${withEmbedding}`);

    if (withEmbedding > 0) {
      const doc = await Content.findOne({ embedding: { $exists: true, $ne: [] } });
      console.log(`Sample doc title: ${doc?.title}, embedding length: ${doc?.embedding?.length}`);
    }

    // Try a simple aggregate to see if index exists and works
    const testEmbed = await generateEmbedding("math");
    const agg = await Content.aggregate([
      {
        $vectorSearch: {
          index: "ContentVectorIndex",
          path: "embedding",
          queryVector: testEmbed,
          numCandidates: 10,
          limit: 2
        }
      }
    ]);
    console.log(`Vector search test without filters returned ${agg.length} results.`);
    
    // Now with filter
    const aggFilter = await Content.aggregate([
      {
        $vectorSearch: {
          index: "ContentVectorIndex",
          path: "embedding",
          queryVector: testEmbed,
          numCandidates: 10,
          limit: 2,
          filter: {
             $and: [
               { expireAt: { $gt: new Date() } }
             ]
          }
        }
      }
    ]);
    console.log(`Vector search test with expireAt filter returned ${aggFilter.length} results.`);
    
    // Now with all filters
    const aggAllFilter = await Content.aggregate([
      {
        $vectorSearch: {
          index: "ContentVectorIndex",
          path: "embedding",
          queryVector: testEmbed,
          numCandidates: 10,
          limit: 2,
          filter: {
             $and: [
               {
                 $or: [
                   { targetDepartment: { $exists: false } },
                   { targetDepartment: { $in: ["Computer Science", ""] } }
                 ]
               },
               {
                 $or: [
                   { targetBatch: { $exists: false } },
                   { targetBatch: { $in: [2024] } }
                 ]
               },
               { expireAt: { $gt: new Date() } }
             ]
          }
        }
      }
    ]);
    console.log(`Vector search test with ALL filters returned ${aggAllFilter.length} results.`);

    process.exit(0);
  } catch (e) {
    console.error("Debug Error:", e);
    process.exit(1);
  }
}

debug();
