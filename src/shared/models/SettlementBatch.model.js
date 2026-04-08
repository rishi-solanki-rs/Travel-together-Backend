import mongoose from 'mongoose';

const settlementBatchSchema = new mongoose.Schema({
  batchRef: { type: String, required: true, unique: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
  currency: { type: String, default: 'INR' },
  grossAmount: { type: Number, default: 0 },
  feesAmount: { type: Number, default: 0 },
  netAmount: { type: Number, default: 0 },
  itemCount: { type: Number, default: 0 },
  settledAt: { type: Date, default: null },
}, { timestamps: true });

settlementBatchSchema.index({ vendorId: 1, status: 1, createdAt: -1 });

export default mongoose.model('SettlementBatch', settlementBatchSchema);
