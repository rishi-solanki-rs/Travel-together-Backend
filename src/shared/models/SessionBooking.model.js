import mongoose from 'mongoose';

const sessionBookingSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  childProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChildProfile', required: true },
  guardianProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuardianProfile', required: true },
  status: { type: String, enum: ['hold', 'confirmed', 'cancelled', 'waitlisted', 'attended', 'no_show'], default: 'hold' },
  holdExpiresAt: { type: Date, default: null },
  sessionDate: { type: Date, default: null },
  paymentStatus: { type: String, enum: ['pending', 'processing', 'paid', 'refunded', 'failed'], default: 'pending' },
  refundStatus: { type: String, enum: ['none', 'requested', 'refunded'], default: 'none' },
  rescheduleHistory: [{
    previousDate: { type: Date, default: null },
    newDate: { type: Date, default: null },
    changedAt: { type: Date, default: Date.now },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: null },
  }],
  transitionHistory: [{
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: null },
  }],
  adminNotes: [{
    note: { type: String, default: null },
    status: { type: String, default: null },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    at: { type: Date, default: Date.now },
  }],
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
}, { timestamps: true });

sessionBookingSchema.index({ listingId: 1, sessionId: 1, status: 1 });
sessionBookingSchema.index({ holdExpiresAt: 1, status: 1 });

export default mongoose.model('SessionBooking', sessionBookingSchema);
