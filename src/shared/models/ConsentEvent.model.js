import mongoose from 'mongoose';

const consentEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  consentType: { type: String, required: true },
  granted: { type: Boolean, required: true },
  scope: { type: String, default: 'global' },
  source: { type: String, default: 'api' },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

consentEventSchema.index({ userId: 1, consentType: 1, createdAt: -1 });

export default mongoose.model('ConsentEvent', consentEventSchema);
