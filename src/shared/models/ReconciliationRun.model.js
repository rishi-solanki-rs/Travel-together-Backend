import mongoose from 'mongoose';

const reconciliationRunSchema = new mongoose.Schema({
  runDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
  stats: {
    duplicatePayments: { type: Number, default: 0 },
    missingSettlements: { type: Number, default: 0 },
    refundMismatches: { type: Number, default: 0 },
    orphanPayments: { type: Number, default: 0 },
    driftAmount: { type: Number, default: 0 },
  },
  notes: { type: String, default: null },
  correlationId: { type: String, required: true, index: true },
}, { timestamps: true });

export default mongoose.model('ReconciliationRun', reconciliationRunSchema);
