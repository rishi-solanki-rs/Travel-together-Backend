import mongoose from 'mongoose';

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, required: true },
    state: { type: String, required: true },
    country: { type: String, default: 'India' },
    description: String,
    shortDescription: String,
    pincode: String,
    timezone: { type: String, default: 'Asia/Kolkata' },

    geoLocation: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    image: { publicId: String, url: String, altText: String },
    coverImage: { publicId: String, url: String, altText: String },
    mobileImage: { publicId: String, url: String, altText: String },
    thumbnailImage: { publicId: String, url: String, altText: String },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isMetroCity: { type: Boolean, default: false },
    order: { type: Number, default: 0 },

    cmsOverrides: {
      pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Page' },
      heroBannerSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CMSSection' },
    },

    stats: {
      totalVendors: { type: Number, default: 0 },
      totalListings: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
    },

    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    seoConfig: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
      ogImage: String,
    },

    nearbyAttractions: [String],
    popularFor: [String],
    bestTimeToVisit: String,
  },
  { timestamps: true }
);

citySchema.index({ slug: 1 });
citySchema.index({ state: 1 });
citySchema.index({ isActive: 1, isFeatured: 1, order: 1 });
citySchema.index({ geoLocation: '2dsphere' });

export default mongoose.model('City', citySchema);
