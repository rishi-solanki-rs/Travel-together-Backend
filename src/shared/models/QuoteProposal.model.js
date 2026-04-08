import mongoose from 'mongoose';

const quoteProposalSchema = new mongoose.Schema({
  inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PackageInquiry', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  quoteRef: { type: String, required: true, unique: true },
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], default: 'draft' },
  amount: {
    subtotal: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  validUntil: { type: Date, default: null },
  notes: { type: String, default: null },
}, { timestamps: true });

quoteProposalSchema.index({ inquiryId: 1, createdAt: -1 });

export default mongoose.model('QuoteProposal', quoteProposalSchema);
