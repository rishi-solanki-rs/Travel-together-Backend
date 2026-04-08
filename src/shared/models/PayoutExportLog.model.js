import mongoose from 'mongoose';

const payoutExportLogSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null, index: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  filters: { type: mongoose.Schema.Types.Mixed, default: {} },
  watermark: { type: String, required: true },
  signature: { type: String, required: true },
  rowCount: { type: Number, default: 0 },
  piiMasked: { type: Boolean, default: true },
}, { timestamps: true });

payoutExportLogSchema.index({ createdAt: -1 });

export default mongoose.model('PayoutExportLog', payoutExportLogSchema);
