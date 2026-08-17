import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAssignment extends Document {
  title: string;
  courseName: string;
  description: string;
  instructorId: Types.ObjectId;
  targetDepartment?: string;
  targetBatch?: number;
  deadline?: Date;
  maxMarks?: number;
  attachment?: {
    filename: string;
    url: string;
    publicId: string;
  };
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    courseName: { type: String, required: true },
    description: { type: String, required: true },
    instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetDepartment: { type: String },
    targetBatch: { type: Number },
    deadline: { type: Date },
    maxMarks: { type: Number },
    attachment: {
      filename: { type: String },
      url: { type: String },
      publicId: { type: String },
    },
    expireAt: { type: Date, required: true },
  },
  { timestamps: true }
);

if (mongoose.models.Assignment) {
  delete mongoose.models.Assignment;
}

export default mongoose.model<IAssignment>('Assignment', AssignmentSchema);
