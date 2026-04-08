import mongoose from 'mongoose';

const chargebackRecordSchema = new mongoose.Schema({
  paymentReference: { type: String, required: true, index: true },
  disputeReference: { type: String, required: true, unique: true },
  sourceType: { type: String, required: true },
  sourceId: { type: mongoose.Schema.Types.Mixed, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  reasonCode: { type: String, default: null },
  status: { type: String, enum: ['opened', 'under_review', 'won', 'lost', 'reversed'], default: 'opened' },
  resolvedAt: { type: Date, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

chargebackRecordSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('ChargebackRecord', chargebackRecordSchema);
