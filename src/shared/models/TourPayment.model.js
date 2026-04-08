import mongoose from 'mongoose';

const tourPaymentSchema = new mongoose.Schema({
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourReservation', required: true },
  provider: { type: String, default: 'manual' },
  gatewayReference: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['initiated', 'captured', 'failed', 'refunded'], default: 'initiated' },
}, { timestamps: true });

tourPaymentSchema.index({ reservationId: 1, createdAt: -1 });

export default mongoose.model('TourPayment', tourPaymentSchema);
