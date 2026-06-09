import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  sentAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: Schema.Types.Mixed,
  isRead: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now },
  readAt: Date,
  expiresAt: Date,
});

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
