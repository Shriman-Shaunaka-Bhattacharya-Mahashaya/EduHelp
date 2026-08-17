import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuestion {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

export interface IExam extends Document {
  courseName: string;
  topics: string[];
  type: 'practice' | 'scheduled';
  scheduledFor?: Date;
  durationMinutes: number;
  instructor: Types.ObjectId;
  targetDepartment?: string;
  targetBatch?: number;
  questions: IQuestion[];
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  questionText: { type: String, required: true },
  options: { type: [String], required: true },
  correctOptionIndex: { type: Number, required: true },
});

const ExamSchema = new Schema<IExam>(
  {
    courseName: { type: String, required: true },
    topics: { type: [String], default: [] },
    type: { type: String, enum: ['practice', 'scheduled'], required: true },
    scheduledFor: {
      type: Date,
      required: function (this: any) {
        return this.type === 'scheduled';
      },
    },
    durationMinutes: { type: Number, default: 60, required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetDepartment: { type: String },
    targetBatch: { type: Number },
    questions: { type: [QuestionSchema], required: true },
    expireAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Prevent mongoose from caching the old model across Next.js HMR reloads
if (mongoose.models.Exam) {
  delete mongoose.models.Exam;
}

export default mongoose.model<IExam>('Exam', ExamSchema);
