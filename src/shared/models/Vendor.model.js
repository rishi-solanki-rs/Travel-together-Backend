import mongoose from 'mongoose';
import { VENDOR_STATUS, CATEGORIES } from '../../shared/constants/index.js';

const socialLinksSchema = new mongoose.Schema({
  website: String,
  facebook: String,
  instagram: String,
  twitter: String,
  youtube: String,
  tripadvisor: String,
}, { _id: false });

const addressSchema = new mongoose.Schema({
  street: String,
  area: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: String,
  country: { type: String, default: 'India' },
  geoLocation: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
  },
}, { _id: false });

const vendorSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String, maxlength: 2000 },
    shortDescription: { type: String, maxlength: 300 },

    category: { type: String, enum: Object.values(CATEGORIES), required: true },
    subCategoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubType' }],

    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staffIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },

    status: { type: String, enum: Object.values(VENDOR_STATUS), default: VENDOR_STATUS.PENDING },
    rejectionReason: { type: String },
    isActive: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },

    contactInfo: {
      primaryPhone: String,
      secondaryPhone: String,
      whatsapp: String,
      email: String,
    },

    address: addressSchema,
    socialLinks: socialLinksSchema,

    logo: { publicId: String, url: String },
    coverImage: { publicId: String, url: String },
    galleryImages: [{ publicId: String, url: String, altText: String, order: Number }],

    businessHours: [{
      day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
      isOpen: { type: Boolean, default: true },
      openTime: String,
      closeTime: String,
    }],

    tags: [String],
    languages: [String],
    yearEstablished: Number,

    kycId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorKYC' },
    activeSubscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorSubscription' },
    currentPlan: { type: String, default: 'free' },

    stats: {
      totalListings: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
      totalInquiries: { type: Number, default: 0 },
      totalWishlists: { type: Number, default: 0 },
      avgRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,

    seoConfig: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },

    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_, ret) => { delete ret.__v; return ret; } },
  }
);

vendorSchema.index({ slug: 1 });
vendorSchema.index({ ownerId: 1 });
vendorSchema.index({ category: 1, status: 1, isActive: 1 });
vendorSchema.index({ cityId: 1, category: 1 });
vendorSchema.index({ 'address.geoLocation': '2dsphere' });
vendorSchema.index({ isDeleted: 1, isActive: 1 });
vendorSchema.index({ isFeatured: 1 });
vendorSchema.index({ tags: 1 });
vendorSchema.index({ createdAt: -1 });

export default mongoose.model('Vendor', vendorSchema);
