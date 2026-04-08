import mongoose from 'mongoose';

const privacyRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestType: { type: String, enum: ['access', 'forget', 'delete', 'consent_export'], required: true, index: true },
  status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued', index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  result: { type: mongoose.Schema.Types.Mixed, default: {} },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

privacyRequestSchema.index({ createdAt: -1 });

export default mongoose.model('PrivacyRequest', privacyRequestSchema);
