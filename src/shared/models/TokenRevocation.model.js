import mongoose from 'mongoose';

const tokenRevocationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: String, default: null, index: true },
  tokenType: { type: String, enum: ['access', 'refresh', 'password_reset', 'webhook'], required: true },
  tokenId: { type: String, default: null, index: true },
  tokenHash: { type: String, default: null, index: true },
  reason: { type: String, default: null },
  expiresAt: { type: Date, required: true, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

tokenRevocationSchema.index({ tokenType: 1, tokenId: 1 });

export default mongoose.model('TokenRevocation', tokenRevocationSchema);
