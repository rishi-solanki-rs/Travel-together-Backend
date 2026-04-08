import mongoose from 'mongoose';

const bookingGuestSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelBooking', required: true },
  fullName: { type: String, required: true },
  age: { type: Number, min: 0, default: null },
  email: { type: String, default: null },
  phone: { type: String, default: null },
  idType: { type: String, default: null },
  idNumber: { type: String, default: null },
  isPrimary: { type: Boolean, default: false },
}, { timestamps: true });

bookingGuestSchema.index({ bookingId: 1, isPrimary: -1 });

export default mongoose.model('BookingGuest', bookingGuestSchema);
