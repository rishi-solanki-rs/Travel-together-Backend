import mongoose from 'mongoose';

const inventoryLedgerSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductItem', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  delta: { type: Number, required: true },
  reason: { type: String, enum: ['order', 'cancel', 'manual_adjustment'], required: true },
  balanceAfter: { type: Number, required: true },
}, { timestamps: true });

inventoryLedgerSchema.index({ productId: 1, createdAt: -1 });

export default mongoose.model('InventoryLedger', inventoryLedgerSchema);
