import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    coverImage: {
      publicId: { type: String, default: '' },
      url: { type: String, default: '' },
      altText: { type: String, default: '' },
    },
    gallery: [{ publicId: String, url: String, altText: String, order: { type: Number, default: 0 } }],
    season: { type: String, trim: true, default: 'all' },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null, index: true },
    areaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Area', default: null, index: true },
    tags: [{ type: String, trim: true, lowercase: true }],
    listingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase' }],
    offerText: { type: String, trim: true, maxlength: 500, default: '' },
    validTill: { type: Date, default: null },
    isFeatured: { type: Boolean, default: false },
    priority: { type: Number, default: 0 },
    ctaLabel: { type: String, trim: true, maxlength: 80, default: 'Get Deal' },
    inquiryShortcut: { type: String, trim: true, maxlength: 120, default: '' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

collectionSchema.index({ vendorId: 1, slug: 1 }, { unique: true });
collectionSchema.index({ cityId: 1, areaId: 1, season: 1, isFeatured: 1 });
collectionSchema.index({ tags: 1 });
collectionSchema.index({ isDeleted: 1, isActive: 1, priority: -1 });

export default mongoose.model('Collection', collectionSchema);
