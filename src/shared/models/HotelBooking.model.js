import mongoose from 'mongoose';

const hotelBookingSchema = new mongoose.Schema({
  hotelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelRoom', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', default: null },
  bookedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  bookingRef: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['hold', 'confirmed', 'cancelled', 'checked_in', 'checked_out', 'refunded', 'expired'],
    default: 'hold',
  },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
  nights: { type: Number, required: true },
  roomsBooked: { type: Number, default: 1 },
  guestsCount: { type: Number, default: 1 },
  holdExpiresAt: { type: Date, default: null },
  cancellationReason: { type: String, default: null },
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
  amount: {
    subtotal: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  analytics: {
    source: { type: String, default: 'direct' },
    conversionStage: { type: String, default: 'hold' },
  },
}, { timestamps: true });

hotelBookingSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
hotelBookingSchema.index({ roomId: 1, checkInDate: 1, checkOutDate: 1 });
hotelBookingSchema.index({ holdExpiresAt: 1, status: 1 });

export default mongoose.model('HotelBooking', hotelBookingSchema);
