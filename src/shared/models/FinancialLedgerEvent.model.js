import mongoose from 'mongoose';

const financialLedgerEventSchema = new mongoose.Schema({
  correlationId: { type: String, required: true, index: true },
  domain: { type: String, enum: ['slots', 'subscriptions', 'bookings', 'shops', 'refunds', 'payouts'], required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.Mixed, required: true },
  eventType: { type: String, required: true },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['recorded', 'pending', 'failed'], default: 'recorded' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

financialLedgerEventSchema.index({ domain: 1, eventType: 1, createdAt: -1 });

export default mongoose.model('FinancialLedgerEvent', financialLedgerEventSchema);
