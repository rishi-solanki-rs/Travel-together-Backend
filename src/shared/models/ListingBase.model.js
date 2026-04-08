import mongoose from 'mongoose';
import { LISTING_STATUS, CATEGORIES } from '../../shared/constants/index.js';

const listingBaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String, maxlength: 5000 },
    shortDescription: { type: String, maxlength: 500 },

    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subtypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubType' },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ListingTemplate' },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area' },

    category: { type: String, enum: Object.values(CATEGORIES), required: true },
    status: { type: String, enum: Object.values(LISTING_STATUS), default: LISTING_STATUS.DRAFT },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },

    address: {
      street: String,
      area: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' },
    },
    geoLocation: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },

    coverImage: { publicId: String, url: String, altText: String },
    galleryImages: [{ publicId: String, url: String, altText: String, order: { type: Number, default: 0 }, role: String }],

    tags: [{ type: String, lowercase: true }],
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    subCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubType' }],
    nearbyLandmarks: [{ type: String, lowercase: true, trim: true }],
    vendorType: {
      type: String,
      enum: [
        'commercial_outlet',
        'mall',
        'market',
        'artisan_store',
        'ngo',
        'boutique',
        'restaurant',
        'cafe',
        'bar_pub',
        'street_food',
        'hotel_restaurant',
        'souvenir_shop',
        'other',
      ],
      default: 'other',
    },
    discoveryType: {
      type: String,
      enum: ['nearby', 'popular_choice', 'super_saver', 'sponsored', 'featured', 'just_in', 'iconic_collection'],
      default: 'nearby',
    },
    areaCluster: { type: String, trim: true, default: '' },
    labels: {
      chain: { type: Boolean, default: false },
      sponsored: { type: Boolean, default: false },
      superSaver: { type: Boolean, default: false },
      popularChoice: { type: Boolean, default: false },
      featured: { type: Boolean, default: false },
      openNow: { type: Boolean, default: false },
    },
    highlights: [String],
    inclusions: [String],
    exclusions: [String],
    policies: [{ title: String, description: String }],

    pricing: {
      priceType: { type: String, enum: ['fixed', 'per_person', 'per_night', 'per_hour', 'free', 'contact_for_price', 'range'] },
      currency: { type: String, default: 'INR' },
      basePrice: Number,
      discountedPrice: Number,
      minPrice: Number,
      maxPrice: Number,
      showPriceAs: { type: String, enum: ['base', 'discounted', 'range', 'hidden'], default: 'base' },
    },

    contactInfo: {
      phone: String,
      whatsapp: String,
      email: String,
      website: String,
    },

    dynamicFields: { type: Map, of: mongoose.Schema.Types.Mixed },

    stats: {
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      wishlistCount: { type: Number, default: 0 },
      inquiryCount: { type: Number, default: 0 },
      shareCount: { type: Number, default: 0 },
    },

    seoConfig: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
      canonicalUrl: String,
    },

    publishedAt: Date,
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
    archivedAt: Date,

    sortOrder: { type: Number, default: 0 },
    planPriority: { type: Number, default: 0 },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_, ret) => { delete ret.__v; return ret; } },
  }
);

listingBaseSchema.index({ vendorId: 1, status: 1 });
listingBaseSchema.index({ categoryId: 1, status: 1, isActive: 1 });
listingBaseSchema.index({ subtypeId: 1, status: 1 });
listingBaseSchema.index({ cityId: 1, category: 1, status: 1 });
listingBaseSchema.index({ cityId: 1, areaId: 1, category: 1, status: 1 });
listingBaseSchema.index({ categoryIds: 1, subCategoryIds: 1 });
listingBaseSchema.index({ nearbyLandmarks: 1 });
listingBaseSchema.index({ vendorType: 1, discoveryType: 1 });
listingBaseSchema.index({ 'labels.sponsored': 1, 'labels.popularChoice': 1, 'labels.superSaver': 1, 'labels.featured': 1 });
listingBaseSchema.index({ slug: 1 });
listingBaseSchema.index({ geoLocation: '2dsphere' });
listingBaseSchema.index({ isDeleted: 1, isActive: 1 });
listingBaseSchema.index({ isFeatured: 1, planPriority: -1 });
listingBaseSchema.index({ tags: 1 });
listingBaseSchema.index({ 'pricing.basePrice': 1 });
listingBaseSchema.index({ createdAt: -1 });
listingBaseSchema.index({ title: 'text', description: 'text', tags: 'text' });

export default mongoose.model('ListingBase', listingBaseSchema);
