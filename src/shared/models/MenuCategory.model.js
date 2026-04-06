import mongoose from 'mongoose';

const menuCategorySchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    name: { type: String, required: true },
    description: String,
    image: { publicId: String, url: String },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    availableSessions: [{ type: String, enum: ['breakfast', 'lunch', 'dinner', 'all_day'] }],
  },
  { timestamps: true }
);

menuCategorySchema.index({ restaurantId: 1, order: 1 });

export default mongoose.model('MenuCategory', menuCategorySchema);
