import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: mongoose.Schema.Types.ObjectId,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performedByRole: String,
    ipAddress: String,
    userAgent: String,
    method: String,
    endpoint: String,
    statusCode: Number,
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, action: 1 });
auditLogSchema.index({ resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
