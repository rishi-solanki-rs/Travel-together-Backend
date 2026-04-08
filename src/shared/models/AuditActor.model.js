import mongoose from 'mongoose';

const auditActorSchema = new mongoose.Schema({
  actorType: { type: String, enum: ['user', 'vendor_admin', 'admin', 'system', 'job'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  email: { type: String, default: null },
  ipAddress: { type: String, default: null },
  userAgent: { type: String, default: null },
}, { timestamps: true });

auditActorSchema.index({ actorType: 1, createdAt: -1 });

export default mongoose.model('AuditActor', auditActorSchema);
