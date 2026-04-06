import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../../shared/constants/index.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(NOTIFICATION_TYPES), required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: Date,
    link: String,
    data: { type: Map, of: mongoose.Schema.Types.Mixed },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isDeleted: 1 });

export default mongoose.model('Notification', notificationSchema);
