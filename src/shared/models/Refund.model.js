import mongoose from 'mongoose';

const refundSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelBooking', default: null },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourReservation', default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  paymentTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction', default: null },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['requested', 'processed', 'rejected'], default: 'requested' },
}, { timestamps: true });

refundSchema.index({ bookingId: 1, createdAt: -1 });
refundSchema.index({ reservationId: 1, createdAt: -1 });

export default mongoose.model('Refund', refundSchema);
