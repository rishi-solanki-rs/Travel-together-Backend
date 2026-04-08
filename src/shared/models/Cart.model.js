import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductItem', required: true },
  quantity: { type: Number, min: 1, required: true },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
}, { _id: false });

const cartSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['active', 'checked_out', 'abandoned'], default: 'active' },
  items: [cartItemSchema],
  couponCode: { type: String, default: null },
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
  totals: {
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
}, { timestamps: true });

cartSchema.index({ userId: 1, vendorId: 1, status: 1 });

export default mongoose.model('Cart', cartSchema);
