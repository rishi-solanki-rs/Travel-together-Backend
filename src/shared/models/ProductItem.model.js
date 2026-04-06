import mongoose from 'mongoose';

const productItemSchema = new mongoose.Schema(
  {
    shopCatalogId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopCatalog', required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    collectionName: String,

    name: { type: String, required: true },
    description: String,
    sku: String,

    images: [{ publicId: String, url: String, altText: String, order: Number }],

    price: { type: Number, required: true },
    discountedPrice: Number,
    currency: { type: String, default: 'INR' },

    stock: { type: Number, default: 0 },
    isInStock: { type: Boolean, default: true },
    isUnlimited: { type: Boolean, default: false },

    material: String,
    dimensions: { length: Number, width: Number, height: Number, unit: String },
    weight: { value: Number, unit: { type: String, default: 'kg' } },
    color: String,
    size: String,

    origin: String,
    craftType: String,
    artisan: { name: String, bio: String, location: String },

    tags: [String],
    isFeatured: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productItemSchema.index({ shopCatalogId: 1, isActive: 1 });
productItemSchema.index({ vendorId: 1 });
productItemSchema.index({ isFeatured: 1 });
productItemSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.model('ProductItem', productItemSchema);
