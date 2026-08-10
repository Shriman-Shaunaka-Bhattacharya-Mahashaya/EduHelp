import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAnswer {
  questionIndex: number;
  selectedOptionIndex: number; // -1 if not attempted
  timeTaken: number; // in seconds
}

export interface IExamAttempt extends Document {
  exam: Types.ObjectId;
  student: Types.ObjectId;
  score: number;
  startedAt: Date;
  completedAt?: Date;
  answers: IAnswer[];
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AnswerSchema = new Schema<IAnswer>({
  questionIndex: { type: Number, required: true },
  selectedOptionIndex: { type: Number, required: true },
  timeTaken: { type: Number, default: 0 },
});

const ExamAttemptSchema = new Schema<IExamAttempt>(
  {
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    answers: { type: [AnswerSchema], default: [] },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent multiple attempts for scheduled exams
ExamAttemptSchema.index({ exam: 1, student: 1 }, { unique: false }); // Uniqueness is enforced in API logic depending on exam type

export default mongoose.models.ExamAttempt || mongoose.model<IExamAttempt>('ExamAttempt', ExamAttemptSchema);
