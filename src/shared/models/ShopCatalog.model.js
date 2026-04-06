import mongoose from 'mongoose';

const shopCatalogSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase', required: true, unique: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },

    shopType: {
      type: String,
      enum: ['handicraft', 'artisan', 'ngo_store', 'fashion', 'jewelry', 'spices', 'textiles', 'books', 'souvenirs', 'organic', 'mixed', 'other'],
    },

    collections: [{
      name: String,
      description: String,
      image: { publicId: String, url: String },
      isActive: Boolean,
      order: Number,
    }],

    pickupOptions: [{ type: String, enum: ['in_store', 'curbside', 'delivery', 'ship_nationwide'] }],
    deliveryAvailable: Boolean,
    shippingInfo: String,
    returnPolicy: String,

    craftTypes: [String],
    materials: [String],
    origins: [String],

    isNGOPartner: Boolean,
    ngoDetails: { name: String, registrationNumber: String, cause: String },

    certifications: [{ name: String, issuedBy: String, year: Number }],
    awards: [{ name: String, year: Number }],

    openingHours: [{
      day: String,
      isOpen: Boolean,
      openTime: String,
      closeTime: String,
    }],

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shopCatalogSchema.index({ listingId: 1 });
shopCatalogSchema.index({ vendorId: 1 });
shopCatalogSchema.index({ shopType: 1 });

export default mongoose.model('ShopCatalog', shopCatalogSchema);
