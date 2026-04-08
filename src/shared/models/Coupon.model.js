import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  code: { type: String, required: true },
  type: { type: String, enum: ['percent', 'flat'], required: true },
  value: { type: Number, required: true },
  minimumOrderValue: { type: Number, default: 0 },
  maxDiscount: { type: Number, default: null },
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  validFrom: { type: Date, default: null },
  validTo: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

couponSchema.index({ vendorId: 1, code: 1 }, { unique: true });

export default mongoose.model('Coupon', couponSchema);
