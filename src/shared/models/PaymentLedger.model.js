import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema({
  account: { type: String, required: true },
  direction: { type: String, enum: ['debit', 'credit'], required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const paymentLedgerSchema = new mongoose.Schema({
  correlationId: { type: String, required: true, index: true },
  sourceType: { type: String, required: true },
  sourceId: { type: mongoose.Schema.Types.Mixed, required: true },
  paymentReference: { type: String, required: true, index: true },
  currency: { type: String, default: 'INR' },
  entries: { type: [ledgerEntrySchema], required: true },
  totalDebits: { type: Number, default: 0 },
  totalCredits: { type: Number, default: 0 },
  status: { type: String, enum: ['balanced', 'unbalanced', 'orphaned'], default: 'balanced' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

paymentLedgerSchema.index({ sourceType: 1, sourceId: 1 });

export default mongoose.model('PaymentLedger', paymentLedgerSchema);
