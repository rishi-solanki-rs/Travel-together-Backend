import mongoose from 'mongoose';

const authSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null, index: true },
  sessionId: { type: String, required: true, unique: true },
  sessionFamilyId: { type: String, required: true, index: true },
  deviceId: { type: String, default: null, index: true },
  refreshTokenHash: { type: String, required: true, select: false },
  refreshTokenVersion: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'revoked', 'expired', 'suspicious'], default: 'active', index: true },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  geoHint: { type: String, default: null },
  lastSeenAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  stepUpVerifiedAt: { type: Date, default: null },
  elevationExpiresAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  revokedReason: { type: String, default: null },
}, { timestamps: true });

authSessionSchema.index({ userId: 1, status: 1, createdAt: -1 });
authSessionSchema.index({ sessionFamilyId: 1, refreshTokenVersion: -1 });

export default mongoose.model('AuthSession', authSessionSchema);
