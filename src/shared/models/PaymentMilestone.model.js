import mongoose from 'mongoose';

const paymentMilestoneSchema = new mongoose.Schema({
  inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PackageInquiry', required: true },
  quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteProposal', required: true },
  label: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'paid', 'overdue', 'cancelled'], default: 'pending' },
  paidAt: { type: Date, default: null },
}, { timestamps: true });

paymentMilestoneSchema.index({ inquiryId: 1, status: 1, dueDate: 1 });

export default mongoose.model('PaymentMilestone', paymentMilestoneSchema);
