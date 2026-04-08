import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', default: null },
  checkoutToken: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'return_requested', 'returned', 'cancelled', 'refunded', 'payment_failed'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'processing', 'paid', 'failed', 'refunded'], default: 'pending' },
  refundStatus: { type: String, enum: ['none', 'requested', 'refunded'], default: 'none' },
  returnStatus: { type: String, enum: ['none', 'requested', 'approved', 'returned', 'rejected'], default: 'none' },
  checkoutAddress: {
    name: { type: String, default: null },
    phone: { type: String, default: null },
    line1: { type: String, default: null },
    line2: { type: String, default: null },
    city: { type: String, default: null },
    state: { type: String, default: null },
    pincode: { type: String, default: null },
    country: { type: String, default: 'India' },
  },
  timeline: [{
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: null },
  }],
  totals: {
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
  },
}, { timestamps: true });

orderSchema.index({ vendorId: 1, status: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);
