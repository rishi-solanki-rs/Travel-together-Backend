import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelBooking', default: null },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourReservation', default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  provider: { type: String, default: 'manual' },
  gatewayReference: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['initiated', 'captured', 'failed', 'refunded'], default: 'initiated' },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

paymentTransactionSchema.index({ bookingId: 1, createdAt: -1 });
paymentTransactionSchema.index({ orderId: 1, createdAt: -1 });

export default mongoose.model('PaymentTransaction', paymentTransactionSchema);
