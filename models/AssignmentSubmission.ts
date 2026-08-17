import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAssignmentSubmission extends Document {
  assignmentId: Types.ObjectId;
  studentId: Types.ObjectId;
  attachment: {
    filename: string;
    url: string;
    publicId: string;
  };
  marksAwarded?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attachment: {
      filename: { type: String, required: true },
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    marksAwarded: { type: Number },
    feedback: { type: String },
  },
  { timestamps: true }
);

if (mongoose.models.AssignmentSubmission) {
  delete mongoose.models.AssignmentSubmission;
}

export default mongoose.model<IAssignmentSubmission>('AssignmentSubmission', AssignmentSubmissionSchema);
