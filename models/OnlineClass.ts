import mongoose, { Schema, Document } from 'mongoose';

export interface IOnlineClass extends Document {
  instructorId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  scheduledAt: Date;
  durationMinutes: number;
  targetDepartment?: string;
  targetBatch?: number;
  targetStudents?: mongoose.Types.ObjectId[];
  status: 'scheduled' | 'ongoing' | 'completed';
  createdAt: Date;
}

const OnlineClassSchema: Schema = new Schema({
  instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, required: true, default: 60 },
  targetDepartment: { type: String },
  targetBatch: { type: Number },
  targetStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['scheduled', 'ongoing', 'completed'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now },
});

// TTL Index to automatically delete classes 6 months (180 days) after schedule date to save space
OnlineClassSchema.index({ scheduledAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export default mongoose.models.OnlineClass || mongoose.model<IOnlineClass>('OnlineClass', OnlineClassSchema);
