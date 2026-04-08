import mongoose from 'mongoose';

const auditDiffSchema = new mongoose.Schema({
  fieldsChanged: { type: [String], default: [] },
  beforeSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  afterSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
  redactedFields: { type: [String], default: [] },
}, { timestamps: true });

auditDiffSchema.index({ createdAt: -1 });

export default mongoose.model('AuditDiff', auditDiffSchema);
