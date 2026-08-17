import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDocumentChunk extends Document {
  contentId: Types.ObjectId;
  text: string;
  embedding: number[];
  createdAt: Date;
}

const DocumentChunkSchema = new Schema<IDocumentChunk>(
  {
    contentId: { type: Schema.Types.ObjectId, ref: 'Content', required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

if (mongoose.models.DocumentChunk) {
  delete mongoose.models.DocumentChunk;
}

export default mongoose.model<IDocumentChunk>('DocumentChunk', DocumentChunkSchema);
