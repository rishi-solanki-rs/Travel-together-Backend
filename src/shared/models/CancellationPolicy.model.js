import mongoose from 'mongoose';

const cancellationPolicySchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  scopeType: { type: String, enum: ['tour', 'hotel', 'package'], required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', default: null },
  cancellationCutoffHours: { type: Number, default: 24 },
  refundPercent: { type: Number, default: 100 },
  noShowRefundPercent: { type: Number, default: 0 },
  notes: { type: String, default: null },
}, { timestamps: true });

cancellationPolicySchema.index({ vendorId: 1, scopeType: 1, listingId: 1 });

export default mongoose.model('CancellationPolicy', cancellationPolicySchema);
