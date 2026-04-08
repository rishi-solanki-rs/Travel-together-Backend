import mongoose from 'mongoose';

const sessionRiskEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  sessionId: { type: String, default: null, index: true },
  eventType: {
    type: String,
    enum: [
      'refresh_replay_detected',
      'geo_switch',
      'device_switch',
      'forced_logout',
      'revoke_all',
      'step_up_required',
      'step_up_passed',
      'break_glass_override',
      'impersonation_started',
      'admin_sensitive_read',
      'token_anomaly',
    ],
    required: true,
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
  geoHint: { type: String, default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

sessionRiskEventSchema.index({ eventType: 1, createdAt: -1 });

export default mongoose.model('SessionRiskEvent', sessionRiskEventSchema);
