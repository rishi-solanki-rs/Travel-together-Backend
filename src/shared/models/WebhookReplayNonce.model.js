import mongoose from 'mongoose';

const webhookReplayNonceSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true },
  nonce: { type: String, required: true, index: true },
  signature: { type: String, required: true },
  eventId: { type: String, default: null },
  processedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  payloadHash: { type: String, required: true },
}, { timestamps: true });

webhookReplayNonceSchema.index({ provider: 1, nonce: 1 }, { unique: true });

export default mongoose.model('WebhookReplayNonce', webhookReplayNonceSchema);
