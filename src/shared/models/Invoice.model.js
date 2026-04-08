import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'HotelBooking', default: null },
  reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'TourReservation', default: null },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  issuedTo: {
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
  },
  lineItems: [{
    title: String,
    quantity: Number,
    unitPrice: Number,
    total: Number,
  }],
  amount: {
    subtotal: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
  status: { type: String, enum: ['draft', 'issued', 'void'], default: 'issued' },
}, { timestamps: true });

invoiceSchema.index({ createdAt: -1 });

export default mongoose.model('Invoice', invoiceSchema);
