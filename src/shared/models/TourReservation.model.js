import mongoose from 'mongoose';

const tourReservationSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true },
  itineraryId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourItinerary', required: true },
  departureId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourDeparture', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  reservedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reservationRef: { type: String, required: true, unique: true },
  tourType: { type: String, enum: ['same_day', 'custom', 'fixed_departure'], default: 'fixed_departure' },
  status: { type: String, enum: ['hold', 'confirmed', 'cancelled', 'expired', 'completed'], default: 'hold' },
  seatsReserved: { type: Number, required: true },
  holdExpiresAt: { type: Date, default: null },
  bookingCutoffApplied: { type: Boolean, default: false },
  amount: {
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  paymentStatus: { type: String, enum: ['pending', 'processing', 'paid', 'failed', 'refunded'], default: 'pending' },
  refundStatus: { type: String, enum: ['none', 'requested', 'refunded'], default: 'none' },
  departureDate: { type: Date, default: null },
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
  analytics: {
    source: { type: String, default: 'direct' },
    conversionStage: { type: String, default: 'hold' },
  },
}, { timestamps: true });

tourReservationSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
tourReservationSchema.index({ departureId: 1, status: 1 });
tourReservationSchema.index({ holdExpiresAt: 1, status: 1 });

export default mongoose.model('TourReservation', tourReservationSchema);
