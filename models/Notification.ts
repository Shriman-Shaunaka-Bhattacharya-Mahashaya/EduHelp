import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'system' }, // e.g. 'reminder', 'system'
    read: { type: Boolean, default: false },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800, // Auto-delete notifications after 7 days (7 * 24 * 60 * 60)
    }
  },
  { timestamps: true }
);

// Compound index to quickly find unread notifications for a user
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
