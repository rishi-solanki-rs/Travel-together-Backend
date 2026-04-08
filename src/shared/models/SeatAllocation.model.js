import mongoose from 'mongoose';

const seatAllocationSchema = new mongoose.Schema({
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourReservation', required: true },
  departureId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourDeparture', required: true },
  seatCount: { type: Number, required: true },
  status: { type: String, enum: ['hold', 'confirmed', 'released'], default: 'hold' },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

seatAllocationSchema.index({ departureId: 1, status: 1 });
seatAllocationSchema.index({ expiresAt: 1, status: 1 });

export default mongoose.model('SeatAllocation', seatAllocationSchema);
