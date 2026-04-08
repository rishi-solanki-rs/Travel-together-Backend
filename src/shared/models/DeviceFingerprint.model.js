import mongoose from 'mongoose';

const deviceFingerprintSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: { type: String, required: true, index: true },
  fingerprintHash: { type: String, required: true },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  trusted: { type: Boolean, default: false },
  riskScore: { type: Number, default: 0 },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  geoHint: { type: String, default: null },
}, { timestamps: true });

deviceFingerprintSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

export default mongoose.model('DeviceFingerprint', deviceFingerprintSchema);
