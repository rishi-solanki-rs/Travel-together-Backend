import mongoose from 'mongoose';
import { CMS_SECTION_TYPES } from '../../shared/constants/index.js';

const ctaSchema = new mongoose.Schema({
  label: String,
  url: String,
  target: { type: String, enum: ['_self', '_blank'], default: '_self' },
  style: { type: String, enum: ['primary', 'secondary', 'outline', 'ghost'], default: 'primary' },
}, { _id: false });

const cmsSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    identifier: { type: String, unique: true, required: true },
    type: { type: String, enum: Object.values(CMS_SECTION_TYPES), required: true },
    description: String,

    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    subtypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubType', default: null },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isGlobal: { type: Boolean, default: false },
    order: { type: Number, default: 0 },

    scheduledFrom: Date,
    scheduledTo: Date,

    desktopImages: [{ publicId: String, url: String, altText: String, linkUrl: String, order: Number }],
    mobileImages: [{ publicId: String, url: String, altText: String, linkUrl: String, order: Number }],

    content: {
      heading: String,
      subheading: String,
      body: String,
      badge: String,
      backgroundColor: String,
      textColor: String,
    },

    cta: ctaSchema,
    secondaryCta: ctaSchema,

    listingIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ListingBase' }],
    vendorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' }],
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'LuckyDrawCampaign' },

    filters: {
      categoryKey: String,
      subtypeKey: String,
      cityId: mongoose.Schema.Types.ObjectId,
      planTiers: [String],
      isFeatured: Boolean,
      sortBy: String,
      limit: { type: Number, default: 10 },
    },

    config: { type: Map, of: mongoose.Schema.Types.Mixed },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

cmsSectionSchema.index({ identifier: 1 });
cmsSectionSchema.index({ pageId: 1, order: 1 });
cmsSectionSchema.index({ cityId: 1, isActive: 1 });
cmsSectionSchema.index({ isActive: 1, isGlobal: 1 });
cmsSectionSchema.index({ scheduledFrom: 1, scheduledTo: 1 });

export default mongoose.model('CMSSection', cmsSectionSchema);
