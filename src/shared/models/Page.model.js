import mongoose from 'mongoose';
import { PAGE_TYPES } from '../../shared/constants/index.js';

const pageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, required: true, lowercase: true },
    type: { type: String, enum: Object.values(PAGE_TYPES), required: true },
    description: String,

    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    subtypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubType', default: null },

    sections: [{
      sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CMSSection' },
      order: { type: Number, default: 0 },
      isVisible: { type: Boolean, default: true },
    }],

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    publishedAt: Date,

    seoConfig: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
      canonicalUrl: String,
      ogImage: String,
      structuredData: String,
    },

    config: { type: Map, of: mongoose.Schema.Types.Mixed },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

pageSchema.index({ slug: 1 });
pageSchema.index({ type: 1, isActive: 1 });
pageSchema.index({ cityId: 1, type: 1 });

export default mongoose.model('Page', pageSchema);
