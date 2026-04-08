import mongoose from 'mongoose';

const auditContextSchema = new mongoose.Schema({
  correlationId: { type: String, required: true, index: true },
  requestId: { type: String, default: null },
  source: { type: String, enum: ['api', 'cron', 'queue', 'internal'], default: 'api' },
  routePath: { type: String, default: null },
  method: { type: String, default: null },
  module: { type: String, default: null },
  traceId: { type: String, default: null },
  spanId: { type: String, default: null },
  tags: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

auditContextSchema.index({ source: 1, createdAt: -1 });

export default mongoose.model('AuditContext', auditContextSchema);
