import mongoose from 'mongoose';

const refundLedgerSchema = new mongoose.Schema({
  sourceType: { type: String, required: true },
  sourceId: { type: mongoose.Schema.Types.Mixed, required: true },
  paymentReference: { type: String, required: true },
  refundReference: { type: String, required: true, unique: true },
  amountRequested: { type: Number, required: true },
  amountProcessed: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['pending', 'processed', 'mismatch', 'failed'], default: 'pending' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

refundLedgerSchema.index({ sourceType: 1, sourceId: 1, createdAt: -1 });

export default mongoose.model('RefundLedger', refundLedgerSchema);
