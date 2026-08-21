import mongoose, { Schema, Document, Types } from 'mongoose';
export interface IContent extends Document {
  title: string;
  description: string;
  course: string;
  tags: string[];
  instructorId: Types.ObjectId;
  targetDepartment?: string;
  targetBatch?: number;
  attachment: {
    filename: string;
    url: string;
    publicId: string;
    resourceType: string;
  };
  expireAt: Date;
  embedding?: number[];
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    course: { type: String, required: true },
    tags: [{ type: String }],
    instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetDepartment: { type: String },
    targetBatch: { type: Number },
    attachment: {
      filename: { type: String, required: true },
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      resourceType: { type: String, default: 'document' },
    },
    expireAt: { type: Date, required: true },
    embedding: { type: [Number] },
  },
  { timestamps: true }
);

// MongoDB Native Full-Text Search index
ContentSchema.index({ title: 'text', course: 'text', tags: 'text' }, {
  weights: {
    title: 5,
    course: 3,
    tags: 2
  },
  name: "TextSearchIndex"
});

if (mongoose.models.Content) {
  delete mongoose.models.Content;
}

export default mongoose.model<IContent>('Content', ContentSchema);
