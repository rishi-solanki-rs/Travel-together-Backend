import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true, index: true },
  module: { type: String, required: true, index: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.Mixed, required: true },
  action: { type: String, required: true },
  severity: { type: String, enum: ['info', 'warn', 'critical'], default: 'info' },
  correlationId: { type: String, required: true, index: true },
  actorRef: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditActor', default: null },
  contextRef: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditContext', default: null },
  diffRef: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditDiff', default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  immutable: { type: Boolean, default: true },
}, { timestamps: true });

auditEventSchema.index({ module: 1, action: 1, createdAt: -1 });
auditEventSchema.index({ entityType: 1, createdAt: -1 });

export default mongoose.model('AuditEvent', auditEventSchema);
