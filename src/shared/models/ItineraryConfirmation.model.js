import mongoose from 'mongoose';

const itineraryConfirmationSchema = new mongoose.Schema({
  inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PackageInquiry', required: true },
  quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuoteProposal', required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'DestinationPackage', required: true },
  status: { type: String, enum: ['draft', 'confirmed', 'in_progress', 'completed', 'cancelled'], default: 'draft' },
  departureDate: { type: Date, default: null },
  returnDate: { type: Date, default: null },
  notes: { type: String, default: null },
}, { timestamps: true });

itineraryConfirmationSchema.index({ inquiryId: 1, status: 1 });

export default mongoose.model('ItineraryConfirmation', itineraryConfirmationSchema);
