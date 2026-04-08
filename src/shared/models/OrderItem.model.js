import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductItem', required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  lineTotal: { type: Number, required: true },
  skuSnapshot: { type: String, default: null },
  titleSnapshot: { type: String, default: null },
}, { timestamps: true });

orderItemSchema.index({ orderId: 1 });
orderItemSchema.index({ productId: 1, createdAt: -1 });

export default mongoose.model('OrderItem', orderItemSchema);
