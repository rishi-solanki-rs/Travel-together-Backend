import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  status: { type: String, enum: ['created', 'packed', 'in_transit', 'out_for_delivery', 'delivered', 'failed'], default: 'created' },
  trackingNumber: { type: String, default: null },
  carrier: { type: String, default: null },
  shippedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
}, { timestamps: true });

shipmentSchema.index({ orderId: 1, status: 1 });

export default mongoose.model('Shipment', shipmentSchema);
