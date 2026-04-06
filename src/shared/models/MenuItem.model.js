import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    menuCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    name: { type: String, required: true },
    description: String,
    image: { publicId: String, url: String, altText: String },
    price: { type: Number, required: true },
    discountedPrice: Number,
    currency: { type: String, default: 'INR' },

    isVeg: { type: Boolean, default: true },
    isJain: Boolean,
    isGlutenFree: Boolean,
    isSpicy: Boolean,
    spicyLevel: { type: Number, min: 0, max: 5 },

    portionSize: String,
    calories: Number,
    allergens: [String],
    ingredients: [String],

    tags: [String],
    isSignature: { type: Boolean, default: false },
    isChefSpecial: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isSeasonalItem: { type: Boolean, default: false },

    availableSessions: [{ type: String, enum: ['breakfast', 'lunch', 'dinner', 'all_day'] }],
    isAvailable: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

menuItemSchema.index({ menuCategoryId: 1, order: 1 });
menuItemSchema.index({ restaurantId: 1, isAvailable: 1 });

export default mongoose.model('MenuItem', menuItemSchema);
