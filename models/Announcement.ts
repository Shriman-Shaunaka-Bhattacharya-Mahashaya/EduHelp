import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  instructorId: mongoose.Types.ObjectId;
  targetDepartment?: string;
  targetBatch?: number;
  attachment?: {
    filename: string;
    url: string;
    publicId: string;
  };
  expireAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
    },
    message: {
      type: String,
      required: [true, 'Please provide a message'],
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor ID is required'],
    },
    targetDepartment: {
      type: String,
    },
    targetBatch: {
      type: Number,
    },
    attachment: {
      filename: String,
      url: { type: String },
      publicId: { type: String },
    },
    expireAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
